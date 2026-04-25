import { useState } from "react";
import axios from "axios";
import Header from "./header";
import { Pill } from "lucide-react";

export default function AjoutProduit() {
  const [formData, setFormData] = useState({
    codeBarre: "",
    designation: "",
    datePeremption: "",
    ppv: "",
    presentation: "",
    forme: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "datePeremption" && value) {
      const dateObj = new Date(value);
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const year = dateObj.getFullYear().toString();
      const formatted = `${month}${year}`; // MMYYYY
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.codeBarre ||
      !formData.designation ||
      !formData.datePeremption
    ) {
      alert("⚠️ Veuillez remplir tous les champs obligatoires !");
      return;
    }

    try {
      const payload = {
        CODE: formData.codeBarre,
        Nom_medicament: formData.designation,
        DATE_PER: formData.datePeremption,
        PPV: parseFloat(formData.ppv) || 0,
        PRESENTATION: formData.presentation,
        FORME: formData.forme,
        PH: "",
        Quantite: 0,
      };

      await axios.post("http://localhost:7194/api/Medicines", payload);
      alert("✅ Produit ajouté avec succès !");
      setFormData({
        codeBarre: "",
        designation: "",
        datePeremption: "",
        ppv: "",
        presentation: "",
        forme: "",
      });
    } catch (error) {
      console.error("Erreur lors de l’ajout du produit :", error);
      alert(
        "❌ Échec de l’ajout du produit. Vérifiez la connexion au serveur."
      );
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all";
  const labelCls =
    "text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header titre="Ajout d’un Nouveau Produit" />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {/* Logo + Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm mb-3">
              <Pill size={22} className="text-white" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
              Nouveau Produit
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ajoutez un médicament à votre inventaire
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Code-barres</label>
              <input
                type="text"
                name="codeBarre"
                placeholder="Ex: 6111234567890"
                className={inputCls}
                value={formData.codeBarre}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className={labelCls}>Désignation</label>
              <input
                type="text"
                name="designation"
                placeholder="Nom du médicament"
                className={inputCls}
                value={formData.designation}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className={labelCls}>Date de péremption</label>
              <input
                type="date"
                name="datePeremption"
                className={inputCls}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>PPV</label>
                <input
                  type="number"
                  name="ppv"
                  placeholder="0.00"
                  className={inputCls}
                  value={formData.ppv}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={labelCls}>Forme</label>
                <input
                  type="text"
                  name="forme"
                  placeholder="Comprimé, sirop..."
                  className={inputCls}
                  value={formData.forme}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Présentation</label>
              <input
                type="text"
                name="presentation"
                placeholder="Boîte de 20..."
                className={inputCls}
                value={formData.presentation}
                onChange={handleChange}
              />
            </div>

            <button
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
              onClick={handleSubmit}
            >
              Confirmer l’ajout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
