import { useState } from "react";

type NouveauProduitProps = {
  onConfirm: (data: {
    code: string;
    designation: string;
    ppv: number;
    presentation: string;
    expiry: string;
  }) => void;
};

export default function NouveauProduit({ onConfirm }: NouveauProduitProps) {
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [ppv, setPpv] = useState<number | "">("");
  const [presentation, setPresentation] = useState("");
  const [expiry, setExpiry] = useState("");

  const handleSubmit = () => {
    if (!code || !designation || !ppv || !presentation || !expiry) {
      alert("Veuillez remplir tous les champs !");
      return;
    }
    onConfirm({ code, designation, ppv: Number(ppv), presentation, expiry });
    // Reset form
    setCode("");
    setDesignation("");
    setPpv("");
    setPresentation("");
    setExpiry("");
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">
        Ajouter un Nouveau Produit
      </h2>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Désignation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="number"
          placeholder="PPV"
          value={ppv}
          onChange={(e) =>
            setPpv(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Présentation"
          value={presentation}
          onChange={(e) => setPresentation(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Date de Péremption (YYYYMM)"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded shadow-md transition"
        >
          Confirmer Produit
        </button>
      </div>
    </div>
  );
}
