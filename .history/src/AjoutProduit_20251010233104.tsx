import { useState } from "react";
import { Button } from "flowbite-react";
import axios from "axios";
import Header from "./header";

export default function AjoutProduit() {
  // Local states
  const [formData, setFormData] = useState({
    codeBarre: "",
    designation: "",
    datePeremption: "",
    ppv: "",
    presentation: "",
    forme: "",
  });

  // Handle field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special case for date → convert to MMYYYY string
    if (name === "datePeremption" && value) {
      const dateObj = new Date(value);
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const year = dateObj.getFullYear().toString();
      const formatted = `${month}${year}`; // "MMYYYY"
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Submit to backend
  const handleSubmit = async () => {
    if (
      !formData.codeBarre ||
      !formData.designation ||
      !formData.datePeremption
    ) {
      alert("Veuillez remplir tous les champs obligatoires !");
      return;
    }

    try {
      await axios.post("http://localhost:7194/api/medecines", formData);
      alert("Produit ajouté avec succès !");
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
      alert("Échec de l’ajout du produit. Vérifiez la connexion au serveur.");
    }
  };

  return (
    <div className="p-6 flex flex-col space-y-4">
      <Header utilisateur="Gestion Produits" titre="Produits" />

      <div className="font-bold text-dark text-lg">
        Ajout d'un Nouveau Produit
      </div>

      <input
        type="text"
        name="codeBarre"
        placeholder="Entrer le code barre du médicament"
        className="border rounded p-2 w-1/4"
        value={formData.codeBarre}
        onChange={handleChange}
      />

      <input
        type="text"
        name="designation"
        placeholder="Entrer la désignation du médicament"
        className="border rounded p-2 w-1/4"
        value={formData.designation}
        onChange={handleChange}
      />

      <input
        type="date"
        name="datePeremption"
        placeholder="Entrer la date de péremption"
        className="border rounded p-2 w-1/4"
        onChange={handleChange}
      />

      <input
        type="number"
        name="ppv"
        placeholder="Entrer le PPV"
        className="border rounded p-2 w-1/4"
        value={formData.ppv}
        onChange={handleChange}
      />

      <input
        type="text"
        name="presentation"
        placeholder="Présentation"
        className="border rounded p-2 w-1/4"
        value={formData.presentation}
        onChange={handleChange}
      />

      <input
        type="text"
        name="forme"
        placeholder="Forme"
        className="border rounded p-2 w-1/4"
        value={formData.forme}
        onChange={handleChange}
      />

      <Button
        className="w-1/4 bg-red-700 hover:bg-red-800"
        onClick={handleSubmit}
      >
        Confirmer
      </Button>
    </div>
  );
}
