import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Header from "./header";

type ChangedRow = {
  id: number;
  code: string | null;
  nom: string;
  forme: string | null;
  presentation: string | null;
  laboratoire: string | null;
  ppv_ancien: number | null;
  ppv_nouveau: number | null;
  ph_nouveau: number | null;
  delta: number | null;
  url: string | null;
  match_score?: number;
  scraped_forme?: string | null;
  scraped_presentation?: string | null;
};

type NewRow = {
  nom: string;
  forme: string | null;
  presentation: string | null;
  ppv: number | null;
  ph: number | null;
  laboratoire: string | null;
  url: string | null;
};

type Diff = {
  summary: {
    scraped: number;
    db_rows: number;
    changed: number;
    new: number;
    unchanged: number;
  };
  changed: ChangedRow[];
  new: NewRow[];
};

const API = "http://localhost:7194/api/pricing";

export default function MiseAJourPrix() {
  const [diff, setDiff] = useState<Diff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [newSelected, setNewSelected] = useState<Set<number>>(new Set());
  const [newImported, setNewImported] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"changed" | "new">("changed");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get<Diff>(`${API}/diff`)
      .then((r) => setDiff(r.data))
      .catch((e) =>
        setError(
          e.response?.data?.message ||
            "Impossible de charger le diff. Exécutez d'abord le scraper."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredChanged = useMemo(() => {
    if (!diff) return [];
    const q = search.trim().toLowerCase();
    return diff.changed.filter((r) =>
      q ? (r.nom || "").toLowerCase().includes(q) : true
    );
  }, [diff, search]);

  const filteredNew = useMemo(() => {
    if (!diff) return [];
    const q = search.trim().toLowerCase();
    // attach stable index so checkboxes are tracked across filtering
    return diff.new
      .map((r, originalIdx) => ({ ...r, _idx: originalIdx }))
      .filter((r) => (q ? (r.nom || "").toLowerCase().includes(q) : true));
  }, [diff, search]);

  const toggleNew = (idx: number) => {
    setNewSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAllNew = () => {
    const pending = filteredNew.filter(
      (r) => !newImported.has(r._idx) && r.ppv !== null
    );
    if (pending.every((r) => newSelected.has(r._idx))) {
      setNewSelected(new Set());
    } else {
      setNewSelected(new Set(pending.map((r) => r._idx)));
    }
  };

  const importNew = async (rows: (NewRow & { _idx: number })[]) => {
    const payload = rows.map((r) => ({
      nom: r.nom,
      forme: r.forme,
      presentation: r.presentation,
      ppv: r.ppv,
      ph: r.ph,
      laboratoire: r.laboratoire,
    }));
    if (payload.length === 0) return;

    const confirm = await Swal.fire({
      title: `Importer ${payload.length} nouveau(x) médicament(s) ?`,
      text: "Ils seront ajoutés à Medicaments avec Quantité = 0.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, importer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#2563eb",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    try {
      const res = await axios.post(`${API}/import-new`, payload);
      setNewImported((prev) => {
        const next = new Set(prev);
        rows.forEach((r) => next.add(r._idx));
        return next;
      });
      setNewSelected(new Set());
      Swal.fire({
        icon: "success",
        title: `${res.data.inserted} médicament(s) importé(s)`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: e.response?.data?.message || "Échec de l'import",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const pending = filteredChanged.filter(
      (r) => !applied.has(r.id) && r.ppv_nouveau !== null
    );
    if (pending.every((r) => selected.has(r.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((r) => r.id)));
    }
  };

  const apply = async (rows: ChangedRow[]) => {
    const payload = rows
      .filter((r) => r.ppv_nouveau !== null)
      .map((r) => ({ id: r.id, newPpv: r.ppv_nouveau }));
    if (payload.length === 0) return;

    const confirm = await Swal.fire({
      title: `Confirmer ${payload.length} mise(s) à jour ?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, appliquer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#059669",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    try {
      const res = await axios.post(`${API}/apply`, payload);
      setApplied((prev) => {
        const next = new Set(prev);
        payload.forEach((p) => next.add(p.id));
        return next;
      });
      setSelected(new Set());
      Swal.fire({
        icon: "success",
        title: `${res.data.updated} prix mis à jour`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: e.response?.data?.message || "Échec de la mise à jour",
      });
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: number | null | undefined) =>
    v == null ? "—" : v.toFixed(2);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50">
        <Header titre="Mise à jour prix" />
        <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
          Chargement du diff...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-slate-50">
        <Header titre="Mise à jour prix" />
        <div className="max-w-[900px] mx-auto px-6 pt-12">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-amber-800 font-medium">{error}</p>
            <p className="mt-2 text-sm text-amber-700">
              Ouvrez un terminal dans{" "}
              <code className="bg-amber-100 px-1 rounded">tools/</code> et
              exécutez :
            </p>
            <pre className="mt-2 bg-slate-900 text-emerald-200 p-3 rounded text-xs">
              python scrape_medicaments.py{"\n"}python compare_prices.py
            </pre>
          </div>
        </div>
      </div>
    );

  if (!diff) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header titre="Mise à jour prix" />

      <div className="max-w-[1600px] mx-auto px-6 pt-5 pb-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-4">
          Mise à jour prix — medicament.ma
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Stat label="Scrapés" value={diff.summary.scraped} tone="slate" />
          <Stat label="DB" value={diff.summary.db_rows} tone="slate" />
          <Stat
            label="Prix changés"
            value={diff.summary.changed}
            tone="emerald"
          />
          <Stat label="Nouveaux" value={diff.summary.new} tone="blue" />
        </div>

        {/* Tabs + search */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setTab("changed")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                tab === "changed"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Prix changés ({diff.summary.changed})
            </button>
            <button
              onClick={() => setTab("new")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                tab === "new"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Nouveaux ({diff.summary.new})
            </button>
          </div>
          <div className="flex-1" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom..."
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[240px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          {tab === "changed" ? (
            <>
              <button
                onClick={toggleAll}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Tout (dé)sélectionner
              </button>
              <button
                disabled={selected.size === 0 || saving}
                onClick={() =>
                  apply(filteredChanged.filter((r) => selected.has(r.id)))
                }
                className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                Appliquer sélection ({selected.size})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleAllNew}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Tout (dé)sélectionner
              </button>
              <button
                disabled={newSelected.size === 0 || saving}
                onClick={() =>
                  importNew(filteredNew.filter((r) => newSelected.has(r._idx)))
                }
                className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                Importer sélection ({newSelected.size})
              </button>
            </>
          )}
        </div>

        {/* Table */}
        {tab === "changed" ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {[
                      "",
                      "Nom",
                      "Forme",
                      "Présentation",
                      "Laboratoire",
                      "Ancien PPV",
                      "Nouveau PPV",
                      "Δ",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChanged.map((r) => {
                    const up = (r.delta ?? 0) > 0;
                    const down = (r.delta ?? 0) < 0;
                    const isApplied = applied.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-50 ${
                          isApplied ? "bg-emerald-50/50" : ""
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            disabled={isApplied || r.ppv_nouveau === null}
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {r.nom}
                          {typeof r.match_score === "number" && r.match_score < 0.8 && (
                            <span
                              title={`Similarité: ${(r.match_score * 100).toFixed(0)}% — vérifiez que c'est bien le même produit`}
                              className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 rounded"
                            >
                              ⚠ {Math.round(r.match_score * 100)}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          <div>{r.forme}</div>
                          {r.scraped_forme && r.scraped_forme !== r.forme && (
                            <div className="text-[10px] text-blue-600 italic">
                              site: {r.scraped_forme}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          <div>{r.presentation}</div>
                          {r.scraped_presentation && r.scraped_presentation !== r.presentation && (
                            <div className="text-[10px] text-blue-600 italic">
                              site: {r.scraped_presentation}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-xs">
                          {r.laboratoire}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-slate-500 line-through">
                          {fmt(r.ppv_ancien)}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-semibold text-slate-900">
                          {fmt(r.ppv_nouveau)}
                        </td>
                        <td
                          className={`px-3 py-2 tabular-nums font-semibold ${
                            up
                              ? "text-rose-600"
                              : down
                              ? "text-emerald-600"
                              : "text-slate-500"
                          }`}
                        >
                          {r.delta == null
                            ? "—"
                            : `${r.delta > 0 ? "+" : ""}${r.delta.toFixed(2)}`}
                        </td>
                        <td className="px-3 py-2">
                          {isApplied ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-full">
                              Appliqué
                            </span>
                          ) : (
                            <button
                              disabled={r.ppv_nouveau === null || saving}
                              onClick={() => apply([r])}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50"
                            >
                              Appliquer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredChanged.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-8 text-center text-slate-400 text-sm"
                      >
                        Aucun changement de prix.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["", "Nom", "Forme", "Présentation", "PPV", "PH", "Laboratoire", ""].map(
                      (h, i) => (
                        <th
                          key={i}
                          className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNew.slice(0, 500).map((r) => {
                    const isImported = newImported.has(r._idx);
                    return (
                      <tr
                        key={r._idx}
                        className={`hover:bg-slate-50 ${
                          isImported ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            disabled={isImported || r.ppv === null}
                            checked={newSelected.has(r._idx)}
                            onChange={() => toggleNew(r._idx)}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {r.nom}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{r.forme}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.presentation}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{fmt(r.ppv)}</td>
                        <td className="px-3 py-2 tabular-nums">{fmt(r.ph)}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">
                          {r.laboratoire}
                        </td>
                        <td className="px-3 py-2">
                          {isImported ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-700 rounded-full">
                              Importé
                            </span>
                          ) : (
                            <button
                              disabled={saving || r.ppv === null}
                              onClick={() => importNew([r])}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                            >
                              Importer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredNew.length > 500 && (
                <div className="px-3 py-2 text-xs text-slate-500 border-t border-slate-100 bg-slate-50">
                  Affichage de 500 / {filteredNew.length}. Affinez la recherche
                  pour voir plus.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "blue";
}) {
  const palette = {
    slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-900" },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  }[tone];
  return (
    <div
      className={`${palette.bg} border ${palette.border} rounded-xl p-4 shadow-sm`}
    >
      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </p>
      <p className={`text-2xl font-semibold tabular-nums ${palette.text}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
