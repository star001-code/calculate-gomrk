import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calculator,
  Package,
  Hash,
  ArrowLeft,
  Search,
  MapPin,
  TrendingUp,
  FileImage,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import logoImg from "@assets/IMG_2293_1770690757765.png";

type StatsData = {
  rows_total: number;
  hs_unique: number;
  units_unique: number;
};

type Checkpoint = {
  id: string;
  name: string;
  fees: { code: string; label: string; amount_iqd: number }[];
};

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  testId,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  loading?: boolean;
  testId: string;
}) {
  return (
    <Card className="group hover:border-primary/20 transition-all duration-300" data-testid={testId}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NavCard({
  title,
  description,
  icon: Icon,
  actionText,
  onClick,
  variant = "primary",
  testId,
}: {
  title: string;
  description: string;
  icon: typeof Calculator;
  actionText: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "accent";
  testId: string;
}) {
  const bgClass = variant === "primary" ? "gradient-gold" : variant === "accent" ? "bg-accent" : "bg-secondary";
  const iconColor = variant === "primary" ? "text-white" : "text-foreground";

  return (
    <Card
      className="cursor-pointer overflow-visible hover-elevate group hover:border-primary/20 transition-all duration-300"
      onClick={onClick}
      data-testid={testId}
    >
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgClass} ${iconColor} shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-primary font-medium group-hover:gap-2.5 transition-all">
            <span>{actionText}</span>
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  const { data: checkpoints, isLoading: cpLoading } = useQuery<Checkpoint[]>({
    queryKey: ["/api/checkpoints"],
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-card via-card to-primary/5 border border-border/50">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/3 rounded-full blur-2xl translate-x-1/4 translate-y-1/4" />
        
        <div className="relative flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-primary/15 rounded-full blur-lg scale-125" />
            <img
              src={logoImg}
              alt="الكمارك العراقية"
              className="w-auto object-contain relative z-10"
              data-testid="img-logo-home"
              style={{ height: '4.5rem' }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary font-medium tracking-wide">النظام الإلكتروني</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-home-title">
              <span className="text-gradient-gold">حاسبة فرق</span>{" "}
              <span>الرسم الكمركي</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              نظام حساب الرسوم الكمركية للمنافذ الحدودية العراقية
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          label="المنتجات"
          value={stats?.rows_total?.toLocaleString() || "0"}
          icon={Package}
          loading={statsLoading}
          testId="stat-products"
        />
        <StatCard
          label="رموز HS"
          value={stats?.hs_unique?.toLocaleString() || "0"}
          icon={Hash}
          loading={statsLoading}
          testId="stat-hs"
        />
        <StatCard
          label="المنافذ"
          value={checkpoints?.length?.toString() || "0"}
          icon={MapPin}
          loading={cpLoading}
          testId="stat-checkpoints"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NavCard
          title="حاسبة الرسوم"
          description="احسب الرسوم الكمركية وفرق الرسم لمنتجاتك بدقة"
          icon={Calculator}
          actionText="ابدأ الحساب"
          onClick={() => navigate("/calculator")}
          variant="primary"
          testId="card-go-calculator"
        />
        <NavCard
          title="تصفح المنتجات"
          description="ابحث في قاعدة البيانات برمز HS أو وصف المنتج"
          icon={Search}
          actionText="تصفح الآن"
          onClick={() => navigate("/search")}
          variant="secondary"
          testId="card-go-products"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NavCard
          title="قراءة المنفست"
          description="حمّل صورة البيان الكمركي واستخرج البيانات تلقائياً"
          icon={FileImage}
          actionText="حمّل صورة"
          onClick={() => navigate("/manifest")}
          variant="accent"
          testId="card-go-manifest"
        />
        <Card className="border-dashed border-border/50">
          <CardContent className="p-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              المنافذ المتاحة
            </CardTitle>
            {cpLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {checkpoints?.map((cp) => (
                  <div
                    key={cp.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    data-testid={`checkpoint-${cp.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0" />
                      <span className="text-sm truncate">{cp.name}</span>
                    </div>
                    {cp.fees.length > 0 && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {cp.fees.length} رسوم
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            كيف يعمل النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Search, title: "ابحث عن المنتج", desc: "ابحث برمز HS أو وصف المنتج في قاعدة البيانات", step: "١" },
              { icon: Calculator, title: "أدخل البيانات", desc: "حدد الوزن والكمية ومتوسط التقييم ونسبة الرسم", step: "٢" },
              { icon: TrendingUp, title: "احصل على النتيجة", desc: "شاهد فرق الرسم الكمركي بالدولار والدينار", step: "٣" },
            ].map((item, i) => (
              <div key={i} className="text-center space-y-3 group">
                <div className="relative mx-auto w-fit">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors mx-auto">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full gradient-gold text-white text-xs font-bold shadow-sm">
                    {item.step}
                  </span>
                </div>
                <h4 className="text-sm font-semibold">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
