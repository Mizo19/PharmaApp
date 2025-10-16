import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import {
  Package,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Edit2,
  Trash2,
  Save,
  X,
} from "lucide-react";

interface Medicine {
  id: number;
  code: string | null;
  nom_medicament: string | null;
  forme: string | null;
  presentation: string | null;
  ppv: number | null;
  ph: string | null;
  quantite: number | null;
  datE_PER: string | null;
  categorie: string | null;
}

const GestionStock: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
    null
  );
  const [dialogState, setDialogState] = useState<Partial<Medicine>>({});
  const [open, setOpen] = useState(false);
  const [lastEditedId, setLastEditedId] = useState<number | null>(null);
  const [categorieFilter, setCategorieFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const tableRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch medicines
  useEffect(() => {
    axios
      .get<Medicine[]>("http://localhost:7194/api/medicines")
      .then((res) => setMedicines(res.data))
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  // Load last edited ID from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem("lastEditedId");
    if (savedId) setLastEditedId(Number(savedId));
  }, []);

  // Scroll to last edited row
  useEffect(() => {
    if (lastEditedId && tableRef.current) {
      const row = tableRef.current.querySelector(
        `tr[data-id='${lastEditedId}']`
      );
      if (row)
        (row as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }
  }, [lastEditedId, medicines]);

  // Filtered and sorted medicines
  const filteredMedicines = useMemo(() => {
    return medicines
      .filter((m) => (categorieFilter ? m.categorie === categorieFilter : true))
      .filter((m) =>
        debouncedSearch
          ? (m.nom_medicament || "")
              .toLowerCase()
              .includes(debouncedSearch.toLowerCase())
          : true
      )
      .sort((a, b) =>
        (a.nom_medicament || "").localeCompare(b.nom_medicament || "")
      );
  }, [medicines, categorieFilter, debouncedSearch]);

  // Stats
  const productsInStock = filteredMedicines.filter(
    (m) => (m.quantite ?? 0) > 0
  ).length;
  const totalStockValue = filteredMedicines.reduce(
    (acc, m) => acc + (m.ppv ?? 0) * (m.quantite ?? 0),
    0
  );

  // Handlers
  const handleEdit = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setDialogState(medicine);
    setOpen(true);
  };

  const handleDialogChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedValue = ["quantite", "ppv", "ph"].includes(name)
      ? Number(value)
      : value;
    setDialogState((prev) => ({ ...prev, [name]: updatedValue }));
  };

  const handleSave = async () => {
    if (!selectedMedicine) return;
    try {
      await axios.put(
        `http://localhost:7194/api/medicines/${selectedMedicine.id}`,
        dialogState
      );
      setMedicines((prev) =>
        prev.map((m) =>
          m.id === selectedMedicine.id ? { ...m, ...dialogState } : m
        )
      );
      setLastEditedId(selectedMedicine.id);
      localStorage.setItem("lastEditedId", selectedMedicine.id.toString());
      setOpen(false);
    } catch (error) {
      console.error("Error updating medicine:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:7194/api/medicines/${id}`);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
      if (id === lastEditedId) {
        setLastEditedId(null);
        localStorage.removeItem("lastEditedId");
      }
    } catch (error) {
      console.error("Error deleting medicine:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      {/* Header avec effet glassmorphism */}
      <div className="mb-8 backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Gestion du Stock
          </h1>
        </div>
        <p className="text-blue-200 text-lg ml-16">
          Système de gestion pharmaceutique avancé
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl p-6 border border-emerald-400/30 shadow-xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-200 text-sm font-medium mb-1">
                Produits en Stock
              </p>
              <p className="text-4xl font-bold text-white">{productsInStock}</p>
            </div>
            <div className="p-4 bg-emerald-500/30 rounded-2xl">
              <TrendingUp className="w-8 h-8 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-blue-400/30 shadow-xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">
                Valeur Totale
              </p>
              <p className="text-4xl font-bold text-white">
                {totalStockValue.toLocaleString()}{" "}
                <span className="text-2xl">MAD</span>
              </p>
            </div>
            <div className="p-4 bg-blue-500/30 rounded-2xl">
              <DollarSign className="w-8 h-8 text-blue-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar avec design moderne */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
            <input
              type="text"
              placeholder="Rechercher un médicament..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
            />
          </div>

          <div className="min-w-[200px] relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 pointer-events-none" />
            <select
              value={categorieFilter}
              onChange={(e) => setCategorieFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="" className="bg-slate-800">
                Toutes les catégories
              </option>
              <option value="Suspension / Sirop" className="bg-slate-800">
                Suspension / Sirop
              </option>
              <option value="Crème / Gel / Pommade" className="bg-slate-800">
                Crème / Gel / Pommade
              </option>
              <option value="Comprimé" className="bg-slate-800">
                Comprimé
              </option>
              <option value="Gélule" className="bg-slate-800">
                Gélule
              </option>
              <option value="Collyre" className="bg-slate-800">
                Collyre
              </option>
              <option value="Autre" className="bg-slate-800">
                Autre
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Table avec design futuriste */}
      <div
        className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
        ref={tableRef}
      >
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 bg-gradient-to-r from-slate-800/95 to-blue-900/95 backdrop-blur-xl z-10">
              <tr>
                {[
                  "ID",
                  "Code",
                  "Nom",
                  "Forme",
                  "Catégorie",
                  "Quantité",
                  "PPV",
                  "PH",
                  "Date Péremption",
                  "Actions",
                ].map((head) => (
                  <th
                    key={head}
                    className="px-6 py-4 text-left text-sm font-bold text-cyan-300 uppercase tracking-wider border-b border-white/10"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMedicines.map((m, idx) => (
                <tr
                  key={m.id}
                  data-id={m.id}
                  className={`border-b border-white/10 transition-all duration-300 hover:bg-white/10 ${
                    m.id === lastEditedId
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 shadow-lg"
                      : ""
                  } ${idx % 2 === 0 ? "bg-white/5" : ""}`}
                >
                  <td className="px-6 py-4 text-white font-medium">{m.id}</td>
                  <td className="px-6 py-4 text-blue-200">{m.code}</td>
                  <td className="px-6 py-4 text-white font-medium">
                    {m.nom_medicament}
                  </td>
                  <td className="px-6 py-4 text-blue-200">{m.forme}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 rounded-full text-xs font-semibold border border-purple-400/30">
                      {m.categorie}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        (m.quantite ?? 0) > 50
                          ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30"
                          : "bg-orange-500/30 text-orange-200 border border-orange-400/30"
                      }`}
                    >
                      {m.quantite}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-emerald-300 font-semibold">
                    {m.ppv} MAD
                  </td>
                  <td className="px-6 py-4 text-blue-200">{m.ph}</td>
                  <td className="px-6 py-4 text-blue-200">{m.datE_PER}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/40 hover:to-blue-500/40 rounded-lg transition-all duration-300 border border-cyan-400/30 hover:scale-110"
                      >
                        <Edit2 className="w-4 h-4 text-cyan-300" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/40 hover:to-pink-500/40 rounded-lg transition-all duration-300 border border-red-400/30 hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4 text-red-300" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal moderne */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 to-blue-900 rounded-3xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">
                Modifier le Médicament
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                "code",
                "nom_medicament",
                "forme",
                "quantite",
                "ppv",
                "ph",
                "datE_PER",
              ].map((field) => (
                <div key={field} className="col-span-2 sm:col-span-1">
                  <label className="block text-cyan-300 text-sm font-semibold mb-2 uppercase tracking-wide">
                    {field.replace("_", " ")}
                  </label>
                  <input
                    type={
                      ["quantite", "ppv", "ph"].includes(field)
                        ? "number"
                        : "text"
                    }
                    name={field}
                    value={(dialogState as any)[field] ?? ""}
                    onChange={handleDialogChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-emerald-500/50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #06b6d4, #3b82f6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #0891b2, #2563eb);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default GestionStock;
