import Header from "./header";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableHead,
  TableCell,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

type Medicine = {
  id: number;
  code: string;
  nom_medicament: string;
  forme: string | null;
  presentation: string | null;
  quantite: number;
  datE_PER: string; // MMYYYY
  categorie: string;
};

// Prefs from Réglages (localStorage)
type Prefs = { expiryAlertMonths: number };
const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem("pharmaPrefs");
    if (!raw) return { expiryAlertMonths: 3 };
    const p = JSON.parse(raw);
    return { expiryAlertMonths: Number(p.expiryAlertMonths) || 3 };
  } catch {
    return { expiryAlertMonths: 3 };
  }
};

// Parse "MMYYYY" / "MYYYY" -> Date at day 1
function parseMMYYYY(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = String(s).trim();
  if (!/^\d{5,6}$/.test(d)) return null;
  const year = parseInt(d.slice(-4), 10);
  const month = parseInt(d.slice(0, -4), 10);
  if (!(month >= 1 && month <= 12) || !(year >= 1900 && year <= 2100)) return null;
  return new Date(year, month - 1, 1);
}

export default function ProchesPerimes() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [prefs] = useState<Prefs>(loadPrefs());

  useEffect(() => {
    axios
      .get("http://localhost:7194/api/medicines")
      .then((res) => setMedicines(res.data))
      .catch((err) => console.error("Medicines fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  // Enrich: compute monthsLeft per row
  const enriched = useMemo(() => {
    const now = new Date();
    const curYM = now.getFullYear() * 12 + now.getMonth();
    return medicines
      .filter((m) => (m.quantite ?? 0) > 0 && m.datE_PER)
      .map((m) => {
        const d = parseMMYYYY(m.datE_PER);
        const monthsLeft = d ? d.getFullYear() * 12 + d.getMonth() - curYM : null;
        return { ...m, _monthsLeft: monthsLeft };
      });
  }, [medicines]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched
      .filter((m) => {
        if (!m.datE_PER) return false;
        const month = m.datE_PER.slice(0, -4).padStart(2, "0");
        const year = m.datE_PER.slice(-4);
        if (filterMonth && month !== filterMonth) return false;
        if (filterYear && year !== filterYear) return false;
        if (q && !(m.nom_medicament || "").toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (a._monthsLeft ?? 9999) - (b._monthsLeft ?? 9999));
  }, [enriched, filterMonth, filterYear, search]);

  // KPIs
  const kpis = useMemo(() => {
    const expired = enriched.filter((m) => (m._monthsLeft ?? 0) < 0).length;
    const within1 = enriched.filter(
      (m) => (m._monthsLeft ?? 99) >= 0 && (m._monthsLeft ?? 99) <= 1
    ).length;
    const within3 = enriched.filter(
      (m) => (m._monthsLeft ?? 99) >= 0 && (m._monthsLeft ?? 99) <= 3
    ).length;
    const withinPref = enriched.filter(
      (m) =>
        (m._monthsLeft ?? 99) >= 0 &&
        (m._monthsLeft ?? 99) <= prefs.expiryAlertMonths
    ).length;
    return { expired, within1, within3, withinPref };
  }, [enriched, prefs.expiryAlertMonths]);

  const toneFor = (monthsLeft: number | null) => {
    if (monthsLeft === null) return "slate";
    if (monthsLeft < 0) return "rose"; // expired
    if (monthsLeft <= 1) return "rose";
    if (monthsLeft <= 3) return "amber";
    if (monthsLeft <= 6) return "blue";
    return "emerald";
  };

  const inputCls =
    "px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all";
  const thCls =
    "text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50";

  return (
    <div className="min-h-screen bg-slate-50">
      <Header titre="Proches péremption" />

      <div className="max-w-[1600px] mx-auto px-6 pt-5 pb-8 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Médicaments proches de péremption
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Triés du plus proche au plus lointain · seuil d'alerte :{" "}
            <span className="font-medium text-slate-700">
              {prefs.expiryAlertMonths} mois
            </span>{" "}
            (Réglages → Préférences)
          </p>
        </div>

        {/* KPI bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Déjà périmés" value={kpis.expired} tone="rose" />
          <KpiCard label="Périment ≤ 1 mois" value={kpis.within1} tone="rose" />
          <KpiCard label="Périment ≤ 3 mois" value={kpis.within3} tone="amber" />
          <KpiCard
            label={`Périment ≤ ${prefs.expiryAlertMonths} mois`}
            value={kpis.withinPref}
            tone="blue"
          />
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un médicament..."
            className={`${inputCls} min-w-[240px] flex-1 md:flex-none`}
          />
          <select
            className={inputCls}
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="">Tous les mois</option>
            {[...Array(12)].map((_, i) => {
              const val = (i + 1).toString().padStart(2, "0");
              return (
                <option key={val} value={val}>
                  {val}
                </option>
              );
            })}
          </select>
          <select
            className={inputCls}
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">Toutes les années</option>
            {[...Array(6)].map((_, i) => {
              const year = new Date().getFullYear() - 1 + i;
              return (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              );
            })}
          </select>
          <button
            onClick={() => {
              setFilterMonth("");
              setFilterYear("");
              setSearch("");
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Réinitialiser
          </button>
          <div className="flex-1" />
          <span className="text-xs text-slate-500">
            <span className="font-semibold text-slate-900 tabular-nums">
              {filtered.length.toLocaleString()}
            </span>{" "}
            résultat(s)
          </span>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell className={thCls}>Nom Médicament</TableHeadCell>
                <TableHeadCell className={thCls}>Code</TableHeadCell>
                <TableHeadCell className={thCls}>Forme</TableHeadCell>
                <TableHeadCell className={thCls}>Quantité</TableHeadCell>
                <TableHeadCell className={thCls}>Péremption</TableHeadCell>
                <TableHeadCell className={thCls}>Dans</TableHeadCell>
                <TableHeadCell className={thCls}>Catégorie</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-slate-100">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                    Aucun médicament proche de péremption pour ce filtre.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((med) => {
                  const tone = toneFor(med._monthsLeft);
                  return (
                    <TableRow key={med.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <TableCell className="text-slate-900 text-sm font-medium">
                        {med.nom_medicament}
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm font-mono">
                        {med.code}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {med.forme}
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm tabular-nums">
                        {med.quantite}
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm tabular-nums font-mono">
                        {med.datE_PER}
                      </TableCell>
                      <TableCell>
                        <MonthsLeftBadge months={med._monthsLeft} tone={tone} />
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {med.categorie}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "rose" | "amber" | "blue" | "emerald";
}) {
  const toneMap = {
    rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
  }[tone];
  return (
    <div className={`${toneMap.bg} border ${toneMap.border} rounded-xl p-4 shadow-sm`}>
      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </p>
      <p className={`text-2xl font-semibold tabular-nums ${toneMap.text}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function MonthsLeftBadge({
  months,
  tone,
}: {
  months: number | null;
  tone: string;
}) {
  if (months === null) return <span className="text-slate-400 text-xs">—</span>;
  const classes: Record<string, string> = {
    rose: "bg-rose-100 text-rose-700 border-rose-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const label =
    months < 0
      ? `Expiré (${Math.abs(months)} mois)`
      : months === 0
      ? "Ce mois"
      : months === 1
      ? "1 mois"
      : `${months} mois`;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${classes[tone]}`}
    >
      {label}
    </span>
  );
}
