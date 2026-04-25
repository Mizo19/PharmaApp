import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import Header from "./header";

interface Sale {
  date: string;
  medicines: string;
  totalArticles: number;
  totalPrice: number;
  typeDeVente: string;
  numeroDeVente: string;
  nomClient: string;
  responsable_Vente: string;
  quantité_Restante: number;
}

type Period = "7j" | "30j" | "mois" | "annee";

const PALETTE = {
  emerald: "#059669",
  emeraldLight: "#10b981",
  amber: "#f59e0b",
  rose: "#ef4444",
  slate: "#64748b",
  blue: "#3b82f6",
};
const PIE_COLORS = [PALETTE.emerald, PALETTE.blue, PALETTE.amber, PALETTE.rose, PALETTE.slate];

const Statistique: React.FC = () => {
  const [data, setData] = useState<Sale[]>([]);
  const [period, setPeriod] = useState<Period>("30j");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:7194/api/sales")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Period filter helpers
  const { periodSales, prevPeriodSales } = useMemo(() => {
    const now = new Date();
    const start = new Date();
    const prevStart = new Date();
    const prevEnd = new Date();

    switch (period) {
      case "7j":
        start.setDate(now.getDate() - 7);
        prevEnd.setDate(now.getDate() - 7);
        prevStart.setDate(now.getDate() - 14);
        break;
      case "30j":
        start.setDate(now.getDate() - 30);
        prevEnd.setDate(now.getDate() - 30);
        prevStart.setDate(now.getDate() - 60);
        break;
      case "mois":
        start.setDate(1);
        prevStart.setMonth(now.getMonth() - 1, 1);
        prevEnd.setMonth(now.getMonth(), 0);
        break;
      case "annee":
        start.setMonth(0, 1);
        prevStart.setFullYear(now.getFullYear() - 1, 0, 1);
        prevEnd.setFullYear(now.getFullYear() - 1, 11, 31);
        break;
    }

    return {
      periodSales: data.filter((s) => new Date(s.date) >= start),
      prevPeriodSales: data.filter((s) => {
        const d = new Date(s.date);
        return d >= prevStart && d < prevEnd;
      }),
    };
  }, [data, period]);

  // KPIs
  const kpis = useMemo(() => {
    const sum = (arr: Sale[]) => arr.reduce((a, s) => a + (s.totalPrice || 0), 0);
    const count = (arr: Sale[]) =>
      new Set(arr.map((s) => s.numeroDeVente)).size || arr.length;
    const articles = (arr: Sale[]) =>
      arr.reduce((a, s) => a + (s.totalArticles || 0), 0);

    const ca = sum(periodSales);
    const caPrev = sum(prevPeriodSales);
    const nbVentes = count(periodSales);
    const nbVentesPrev = count(prevPeriodSales);
    const nbArticles = articles(periodSales);
    const nbArticlesPrev = articles(prevPeriodSales);
    const panier = nbVentes ? ca / nbVentes : 0;
    const panierPrev = nbVentesPrev ? caPrev / nbVentesPrev : 0;

    const delta = (now: number, prev: number) =>
      !prev ? null : ((now - prev) / prev) * 100;

    return {
      ca,
      caDelta: delta(ca, caPrev),
      nbVentes,
      nbVentesDelta: delta(nbVentes, nbVentesPrev),
      nbArticles,
      nbArticlesDelta: delta(nbArticles, nbArticlesPrev),
      panier,
      panierDelta: delta(panier, panierPrev),
    };
  }, [periodSales, prevPeriodSales]);

  // Top 5 meds
  const topMedicaments = useMemo(() => {
    const map: Record<string, number> = {};
    periodSales.forEach((s) => {
      map[s.medicines] = (map[s.medicines] || 0) + (s.totalArticles || 0);
    });
    return Object.entries(map)
      .map(([name, total]) => ({
        name: name.length > 18 ? name.slice(0, 16) + "…" : name,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [periodSales]);

  // Daily sales timeline (period)
  const dailySales = useMemo(() => {
    const map: Record<string, number> = {};
    periodSales.forEach((s) => {
      const key = s.date.slice(0, 10);
      map[key] = (map[key] || 0) + (s.totalPrice || 0);
    });
    return Object.entries(map)
      .map(([date, total]) => ({ date: date.slice(5), total: +total.toFixed(2) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [periodSales]);

  // Monthly trend (last 12 months, not filtered by period)
  const monthlyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = 0;
    }
    data.forEach((s) => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in map) map[key] += s.totalPrice || 0;
    });
    return Object.entries(map).map(([mois, total]) => ({
      mois: mois.slice(2),
      total: +total.toFixed(2),
    }));
  }, [data]);

  // Type de vente
  const typeDeVenteData = useMemo(() => {
    const map: Record<string, number> = {};
    periodSales.forEach((s) => {
      map[s.typeDeVente || "Autre"] =
        (map[s.typeDeVente || "Autre"] || 0) + (s.totalPrice || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }, [periodSales]);

  // Responsables
  const responsableData = useMemo(() => {
    const map: Record<string, number> = {};
    periodSales.forEach((s) => {
      const r = s.responsable_Vente || "Inconnu";
      map[r] = (map[r] || 0) + (s.totalPrice || 0);
    });
    return Object.entries(map)
      .map(([responsable, total]) => ({ responsable, total: +total.toFixed(2) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [periodSales]);

  const periodLabel: Record<Period, string> = {
    "7j": "7 derniers jours",
    "30j": "30 derniers jours",
    mois: "Ce mois-ci",
    annee: "Cette année",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header titre="Statistiques" />

      <div className="max-w-[1600px] mx-auto px-6 pt-5 pb-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Tableau de bord
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {periodLabel[period]} · comparé à la période précédente
            </p>
          </div>
          <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg">
            {(["7j", "30j", "mois", "annee"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  period === p
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p === "7j" ? "7 jours" : p === "30j" ? "30 jours" : p === "mois" ? "Mois" : "Année"}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Chiffre d'affaires"
            value={`${kpis.ca.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} MAD`}
            delta={kpis.caDelta}
            tone="emerald"
          />
          <Kpi
            label="Nombre de ventes"
            value={kpis.nbVentes.toLocaleString()}
            delta={kpis.nbVentesDelta}
            tone="blue"
          />
          <Kpi
            label="Articles vendus"
            value={kpis.nbArticles.toLocaleString()}
            delta={kpis.nbArticlesDelta}
            tone="amber"
          />
          <Kpi
            label="Panier moyen"
            value={`${kpis.panier.toFixed(2)} MAD`}
            delta={kpis.panierDelta}
            tone="slate"
          />
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
            Chargement des données...
          </div>
        )}

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard
            title="Évolution — 12 derniers mois"
            subtitle="Chiffre d'affaires mensuel (MAD)"
            className="lg:col-span-2"
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gEm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={PALETTE.emerald}
                  strokeWidth={2}
                  fill="url(#gEm)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Types de vente" subtitle={periodLabel[period]}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={typeDeVenteData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {typeDeVenteData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Ventes par jour"
            subtitle={periodLabel[period]}
            className="lg:col-span-2"
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={PALETTE.emerald}
                  strokeWidth={2}
                  dot={{ r: 2, fill: PALETTE.emerald }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top responsables" subtitle="Par chiffre d'affaires">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={responsableData}
                layout="vertical"
                margin={{ left: 10, right: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  dataKey="responsable"
                  type="category"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  width={80}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill={PALETTE.emerald} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Top 8 médicaments"
            subtitle={`Articles vendus · ${periodLabel[period]}`}
            className="lg:col-span-3"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topMedicaments} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill={PALETTE.emerald} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

const tooltipStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  fontSize: 12,
};

function Kpi({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: number | null;
  tone: "emerald" | "blue" | "amber" | "slate";
}) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
    amber: "text-amber-600 bg-amber-50",
    slate: "text-slate-600 bg-slate-50",
  }[tone];
  const up = delta != null && delta >= 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {delta != null && (
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
              up
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
          <span className={`text-[11px] ${toneMap} px-1.5 py-0.5 rounded`}>
            vs précédent
          </span>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-sm p-4 ${className}`}
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default Statistique;
