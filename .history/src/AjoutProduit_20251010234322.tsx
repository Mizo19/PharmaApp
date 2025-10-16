import { useState } from "react";
import { Button } from "flowbite-react";
import axios from "axios";
import Header from "./header";
import { Pill } from "lucide-react"; // For a nice medicine icon 💊

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100">
      <Header utilisateur="Gestion Produits" titre="Produits" />

      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="flex items-center justify-center mb-6">
          <Pill size={40} className="text-emerald-600 mr-2" />
          <h1 className="text-2xl font-bold text-emerald-700">PharmaSoft</h1>
        </div>

        <h2 className="text-lg font-semibold mb-4 text-gray-700">
          💊 Ajout d’un Nouveau Produit
        </h2>

        <div className="flex flex-col space-y-3">
          <input
            type="text"
            name="codeBarre"
            placeholder="Code barre du médicament"
            className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-emerald-400"
            value={formData.codeBarre}
            onChange={handleChange}
          />

          <input
            type="text"
            name="designation"
            placeholder="Désignation du médicament"
            className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-emerald-400"
            value={formData.designation}
            onChange={handleChange}
          />

          <input
            type="date"
            name="datePeremption"
            placeholder="Date de péremption"
            className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-emerald-400"
            onChange={handleChange}
          />

          <input
            type="number"
            name="ppv"
            placeholder="PPV"
            className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-emerald-400"
            value={formData.ppv}
            onChange={handleChange}
          />

          <input
            type="text"
            name="presentation"
            placeholder="Présentation"
            className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-emerald-400"
            value={formData.presentation}
            onChange={handleChange}
          />

          <input
            type="text"
            name="forme"
            placeholder="Forme"
            className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-emerald-400"
            value={formData.forme}
            onChange={handleChange}
          />

          <Button
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
            onClick={handleSubmit}
          >
            ✅ Confirmer l’ajout
          </Button>
        </div>
      </div>
    </div>
  );
}
