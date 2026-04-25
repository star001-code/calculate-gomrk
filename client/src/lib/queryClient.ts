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
let fetchPatched = false;

function toNum(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normHs(value: any): string {
  return String(value || "").replace(/[^\d]/g, "").trim();
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

function calcDuty(body: any) {
  const fxRate = Number(body?.fx_rate || 1320);
  const items = Array.isArray(body?.items) ? body.items : [];
  const resultItems = items.map((item: any) => {
    const quantity = Number(item.quantity || 0);
    const avgValue = Number(item.avg_value || 0);
    const dutyRate = Number(item.duty_rate || 0);
    const paidDuty = Number(item.paid_duty || 0);
    const dutyUsd = quantity * avgValue * dutyRate;
    const differenceUsd = dutyUsd - paidDuty;
    return {
      hs_code: String(item.hs_code || ""),
      description: String(item.description || item.hs_code || ""),
      quantity,
      unit: String(item.unit || ""),
      avg_value: avgValue,
      duty_rate: dutyRate,
      goods_category: String(item.goods_category || ""),
      duty_usd: dutyUsd,
      paid_duty_usd: paidDuty,
      difference_usd: differenceUsd,
      difference_iqd: differenceUsd * fxRate,
    };
  });
  const summary = resultItems.reduce(
    (acc: any, item: any) => {
      acc.total_duty_usd += item.duty_usd;
      acc.total_paid_usd += item.paid_duty_usd;
      acc.total_difference_usd += item.difference_usd;
      acc.total_difference_iqd += item.difference_iqd;
      return acc;
    },
    { total_duty_usd: 0, total_paid_usd: 0, total_difference_usd: 0, total_difference_iqd: 0 },
  );
  return { fx_rate: fxRate, items: resultItems, summary };
}

async function bodyJson(init?: RequestInit): Promise<any> {
  try {
    if (!init?.body) return {};
    if (typeof init.body === "string") return JSON.parse(init.body);
    return {};
  } catch {
    return {};
  }
}

async function validateHs(init?: RequestInit) {
  const body = await bodyJson(init);
  const codes: string[] = Array.isArray(body.hs_codes) ? body.hs_codes.map(normHs) : [];
  const products = await loadProducts();
  const results: Record<string, any> = {};
  for (const code of codes) {
    const match = products.find((p) => p.hs_code === code) || products.find((p) => p.hs_code.startsWith(code) || code.startsWith(p.hs_code));
    results[code] = match
      ? {
          found: true,
          description: match.description,
          unit: match.unit,
          min_value: match.min_value,
          avg_value: match.avg_value,
          max_value: match.max_value,
        }
      : { found: false };
  }
  return { results };
}

function tariffRow(p: StaticProduct): string[] {
  return [
    p.hs_code || "",
    p.description || "",
    p.unit || "",
    p.duty_rate != null ? `${Math.round(p.duty_rate * 100)}%` : "",
    p.avg_value != null ? String(p.avg_value) : "",
  ];
}

async function tariffTable(init?: RequestInit) {
  const body = await bodyJson(init);
  const products = await loadProducts();
  let rows = products.map(tariffRow);

  const hsSearch = String(body.hsSearchTerm || "").trim();
  const descSearch = String(body.descriptionSearchTerm || "").trim().toLowerCase();
  if (hsSearch) rows = rows.filter((r) => r[0].includes(normHs(hsSearch)));
  if (descSearch) rows = rows.filter((r) => r[1].toLowerCase().includes(descSearch));

  const filters = body.columnFilters || {};
  for (const [col, vals] of Object.entries(filters)) {
    const idx = Number(col);
    if (Array.isArray(vals) && vals.length > 0) {
      const set = new Set(vals.map(String));
      rows = rows.filter((r) => set.has(r[idx] || ""));
    }
  }

  const sortColumn = body.sortColumn != null ? Number(body.sortColumn) : null;
  const sortDirection = body.sortDirection === "desc" ? "desc" : "asc";
  if (sortColumn !== null && Number.isFinite(sortColumn)) {
    rows = rows.slice().sort((a, b) => {
      const av = a[sortColumn] || "";
      const bv = b[sortColumn] || "";
      const an = Number(String(av).replace(/[^0-9.-]/g, ""));
      const bn = Number(String(bv).replace(/[^0-9.-]/g, ""));
      const cmp = Number.isFinite(an) && Number.isFinite(bn) && av !== "" && bv !== "" ? an - bn : String(av).localeCompare(String(bv), "ar");
      return sortDirection === "desc" ? -cmp : cmp;
    });
  }

  const page = Math.max(1, Number(body.page || 1));
  const pageSize = Math.max(1, Number(body.pageSize || 10));
  const totalRecords = products.length;
  const filteredRecords = rows.length;
  const totalPages = Math.max(1, Math.ceil(filteredRecords / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    success: true,
    data: rows.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    filteredRecords,
    totalRecords,
    totalPages,
  };
}

async function tariffColumnValues(url: string) {
  const parsed = new URL(url, window.location.origin);
  const col = Number(parsed.pathname.replace("/api/tariff/column-values/", ""));
  const products = await loadProducts();
  const values = Array.from(new Set(products.map((p) => tariffRow(p)[col] || ""))).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
  return { success: true, values: values.slice(0, 1000) };
}

async function staticApi(url: string, init?: RequestInit): Promise<any> {
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
    const digits = q.replace(/[^\d]/g, "");
    return products
      .filter((p) => (digits && p.hs_code.includes(digits)) || (p.description || "").toLowerCase().includes(q))
      .slice(0, limit);
  }

  if (path.startsWith("/api/hs/")) {
    const hs = normHs(decodeURIComponent(path.replace("/api/hs/", "")));
    const limit = Number(parsed.searchParams.get("limit") || 50);
    return products.filter((p) => p.hs_code.startsWith(hs)).slice(0, limit);
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

  if (path === "/api/tariff/table") return tariffTable(init);
  if (path.startsWith("/api/tariff/column-values/")) return tariffColumnValues(url);
  if (path === "/api/calculate") return calcDuty(await bodyJson(init));
  if (path === "/api/manifest/validate-hs") return validateHs(init);

  if (path === "/api/manifest/extract" || path === "/api/manifest/extract-multi") {
    return {
      declaration_number: "",
      declaration_date: "",
      checkpoint: "",
      importer_name: "",
      origin_country: "",
      currency: "USD",
      fx_rate: 1320,
      total_packages: 0,
      transport_method: "",
      container_number: "",
      paid_amount_usd: 0,
      duty_paid_usd: 0,
      tax_paid_usd: 0,
      total_value_usd: 0,
      items: [],
    };
  }

  return null;
}

function patchFetchForStaticApi() {
  if (fetchPatched || typeof window === "undefined") return;
  fetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const normalized = new URL(url, window.location.origin);
    if (normalized.pathname.startsWith("/api/")) {
      return jsonResponse(await staticApi(normalized.toString(), init));
    }
    return originalFetch(input, init);
  };
}

patchFetchForStaticApi();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(method: string, url: string, data?: unknown | undefined): Promise<Response> {
  if (url.startsWith("/api/")) {
    const result = await staticApi(url, {
      method,
      body: data ? JSON.stringify(data) : undefined,
    });
    return jsonResponse(result);
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
