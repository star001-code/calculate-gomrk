import { QueryClient, QueryFunction } from "@tanstack/react-query";

type RawProduct = Record<string, any>;

type StaticProduct = {
  id: number;
  hs_code: string;
  cst_code: string | null;
  description: string | null;
  unit: string | null;
  weight: number | null;
  unit_price: number | null;
  is_protected: boolean | null;
  protection_level: string | null;
  protection_percentage: number | null;
  decision_action: string | null;
  decision_risk: string | null;
  decision_reason: string | null;
  min_value: number | null;
  avg_value: number | null;
  max_value: number | null;
  duty_rate: number | null;
  currency: string | null;
};

let productsCache: StaticProduct[] | null = null;
let tariffCache: { hs_rates?: Record<string, number>; chapter_defaults?: Record<string, number> } | null = null;

function toNum(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normHs(value: any): string {
  return String(value || "").replace(/[^\d]/g, "").trim();
}

async function loadTariff() {
  if (tariffCache) return tariffCache;
  try {
    tariffCache = await fetch(`${import.meta.env.BASE_URL}attached_assets/tariff_law22_2010.json`).then((r) => r.json());
  } catch {
    tariffCache = { hs_rates: {}, chapter_defaults: {} };
  }
  return tariffCache;
}

async function lookupDutyRate(hsCode: string): Promise<number | null> {
  const tariff = await loadTariff();
  const hs = normHs(hsCode);
  const rates = tariff.hs_rates || {};
  const chapters = tariff.chapter_defaults || {};
  if (rates[hs] !== undefined) return rates[hs] / 100;
  if (hs.length >= 6 && rates[hs.slice(0, 6)] !== undefined) return rates[hs.slice(0, 6)] / 100;
  const chapter = hs.slice(0, 2);
  if (chapters[chapter] !== undefined) return chapters[chapter] / 100;
  return 0.2;
}

async function loadProducts(): Promise<StaticProduct[]> {
  if (productsCache) return productsCache;
  let raw: RawProduct[] = [];
  try {
    raw = await fetch(`${import.meta.env.BASE_URL}attached_assets/ALL_PRODUCTS_WITH_DECISION_CLEAN.json`).then((r) => r.json());
  } catch {
    raw = [];
  }

  const rows: StaticProduct[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const hs = normHs(item.IDE_HSC_NB1 || item.hs_code || item.hsCode);
    if (!hs) continue;

    const min = toNum(item.GDS_MIN);
    const max = toNum(item.GDS_MAX);
    let avg = toNum(item.GDS_YER);
    if ((avg === null || avg === 0) && min !== null && max !== null) avg = (min + max) / 2;
    const decision = item.decision || {};

    rows.push({
      id: i + 1,
      hs_code: hs,
      cst_code: item.cst_code || null,
      description: String(item.product || item.description || "").trim() || null,
      unit: item.unit || null,
      weight: toNum(item.weight),
      unit_price: toNum(item.unit_price),
      is_protected: item.protection === true,
      protection_level: String(item.protection_level || "").trim() || null,
      protection_percentage: toNum(item.protection_percentage),
      decision_action: String(decision.action || "").trim() || null,
      decision_risk: String(decision.risk || "").trim() || null,
      decision_reason: String(decision.reason || "").trim() || null,
      min_value: min,
      avg_value: avg,
      max_value: max,
      duty_rate: await lookupDutyRate(hs),
      currency: "USD",
    });
  }

  productsCache = rows;
  return rows;
}

function checkpoints() {
  return [
    { id: "shalamcheh", name: "الشلامجة", fees: [{ code: "service", label: "رسوم خدمات", amount_iqd: 0 }] },
    { id: "safwan", name: "سفوان", fees: [{ code: "service", label: "رسوم خدمات", amount_iqd: 0 }] },
    { id: "umm_qasr", name: "أم قصر", fees: [{ code: "service", label: "رسوم خدمات", amount_iqd: 0 }] },
  ];
}

async function staticApi(url: string): Promise<any> {
  const parsed = new URL(url, window.location.origin);
  const path = parsed.pathname;
  const products = await loadProducts();

  if (path === "/api/stats") {
    return {
      rows_total: products.length,
      hs_unique: new Set(products.map((p) => p.hs_code)).size,
      units_unique: new Set(products.map((p) => p.unit).filter(Boolean)).size,
    };
  }

  if (path === "/api/checkpoints") return checkpoints();

  if (path === "/api/search") {
    const q = (parsed.searchParams.get("q") || "").trim().toLowerCase();
    const limit = Number(parsed.searchParams.get("limit") || 50);
    if (!q) return [];
    return products
      .filter((p) => p.hs_code.includes(q.replace(/[^\d]/g, "")) || (p.description || "").toLowerCase().includes(q))
      .slice(0, limit);
  }

  if (path === "/api/products") {
    const page = Math.max(1, Number(parsed.searchParams.get("page") || 1));
    const limit = Math.max(1, Number(parsed.searchParams.get("limit") || 50));
    const start = (page - 1) * limit;
    return {
      products: products.slice(start, start + limit),
      page,
      total_pages: Math.max(1, Math.ceil(products.length / limit)),
      total_count: products.length,
    };
  }

  return null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(method: string, url: string, data?: unknown | undefined): Promise<Response> {
  if (url.startsWith("/api/")) {
    const result = await staticApi(url);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;

    if (url.startsWith("/api/")) {
      return (await staticApi(url)) as T;
    }

    const res = await fetch(url, { credentials: "include" });
    if (unauthorizedBehavior === "returnNull" && res.status === 401) return null as T;
    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: { retry: false },
  },
});
