import React, { useState } from "react";
import { Package, CheckCircle, XCircle, Calendar } from "lucide-react";

type Medicine = {
  id: number;
  code: string;
  nom_medicament: string;
  forme: string;
  ppv: number;
  presentation?: string;
  datE_PER?: string;
  quantite?: number;
  ph?: string;
  categorie?: string;
};

type CartItem = Medicine & { quantite: number };

interface AvoirModalProps {
  cart: CartItem[];
  utilisateur: string;
  onComplete: () => void;
  onCancel: () => void;
}

const AvoirModal: React.FC<AvoirModalProps> = ({
  cart,
  utilisateur,
  onComplete,
  onCancel,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [datePeremption, setDatePeremption] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [log, setLog] = useState<
    Array<{ item: string; success: boolean; message: string }>
  >([]);

  const validateDate = (date: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\d{4}$/; // MMYYYY
    return regex.test(date);
  };

  const processItem = async () => {
    if (!validateDate(datePeremption)) {
      setError("Format invalide ! Utilisez MMYYYY (ex: 122024)");
      return;
    }

    setError("");
    setProcessing(true);
    const item = cart[currentIndex];

    try {
      // 1️⃣ Fetch all medicines to check existing stock
      const resp = await fetch("http://localhost:7194/api/medicines");
      if (!resp.ok) throw new Error("Erreur API");
      const medicines: Medicine[] = await resp.json();

      // 2️⃣ Check for existing stock with same ID and:
      // - either same DATE_PER
      // - or empty DATE_PER (prefer to update empty-date stock)
      const existing = medicines.find(
        (m) =>
          m.id === item.id && (!m.datE_PER || m.datE_PER === datePeremption)
      );

      if (existing) {
        // Update existing record
        const updated = {
          ...existing,
          Quantite: (existing.quantite || 0) + item.quantite,
          datE_PER: existing.datE_PER || datePeremption, // fill empty DATE_PER
        };

        const updateRes = await fetch(
          `http://localhost:7194/api/medicines/${existing.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          }
        );

        if (!updateRes.ok) throw new Error("Erreur mise à jour stock");

        setLog((prev) => [
          ...prev,
          {
            item: item.nom_medicament,
            success: true,
            message: `Qté ajoutée: +${item.quantite} (mise à jour existante)`,
          },
        ]);
      } else {
        // Create new stock line
        const template = medicines.find((m) => m.id === item.id);
        const newMed = {
          CODE: template?.code || item.code || item.id.toString(),
          Nom_medicament: item.nom_medicament,
          FORME: template?.forme || item.forme || "",
          PRESENTATION: template?.presentation || item.presentation || "",
          PPV: item.ppv,
          PH: template?.ph || "0",
          Quantite: item.quantite,
          datE_PER: datePeremption,
          categorie: template?.categorie || "",
        };

        const createRes = await fetch("http://localhost:7194/api/medicines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMed),
        });

        if (!createRes.ok) throw new Error("Erreur création stock");

        setLog((prev) => [
          ...prev,
          {
            item: item.nom_medicament,
            success: true,
            message: `Nouvelle ligne créée (${datePeremption})`,
          },
        ]);
      }

      // 3️⃣ Record in sales as "Avoir"
      const saleResp = await fetch("http://localhost:7194/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            date: new Date().toISOString(),
            medicineId: item.id,
            medicines: item.nom_medicament,
            totalArticles: item.quantite,
            totalPrice: item.quantite * item.ppv,
            typeDeVente: "Avoir",
            numeroDeVente: 0,
            nomClient: "Pharmacist",
            responsable_Vente: utilisateur,
            quantiteVendue: item.quantite,
            datE_PER: datePeremption,
          },
        ]),
      });

      if (!saleResp.ok) throw new Error("Erreur enregistrement vente");

      // Move to next item
      if (currentIndex < cart.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setDatePeremption("");
      } else {
        alert(`✅ Avoir traité ! ${cart.length} article(s) retournés.`);
        onComplete();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(msg);
      setLog((prev) => [
        ...prev,
        { item: item.nom_medicament, success: false, message: msg },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const currentItem = cart[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Package className="text-orange-600" size={28} />
          <h2 className="text-2xl font-bold">Traiter Avoir</h2>
        </div>

        <div className="mb-4 p-4 bg-orange-50 rounded-lg">
          <p className="font-semibold text-lg">{currentItem.nom_medicament}</p>
          <p className="text-sm text-gray-600">
            Quantité à retourner: {currentItem.quantite}
          </p>
          <p className="text-sm text-gray-600">
            Article {currentIndex + 1} sur {cart.length}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            <Calendar className="inline mr-1" size={16} />
            Date de péremption (MMYYYY)
          </label>
          <input
            type="text"
            value={datePeremption}
            onChange={(e) => setDatePeremption(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && processItem()}
            placeholder="122024"
            maxLength={6}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            autoFocus
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
            <XCircle className="text-red-600" size={20} />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {log.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto">
            <p className="text-sm font-semibold mb-2">Journal:</p>
            {log.map((l, i) => (
              <div
                key={i}
                className={`text-xs p-2 rounded mb-1 flex items-start gap-1 ${
                  l.success ? "bg-green-50" : "bg-red-50"
                }`}
              >
                {l.success ? (
                  <CheckCircle size={14} className="text-green-600 mt-0.5" />
                ) : (
                  <XCircle size={14} className="text-red-600 mt-0.5" />
                )}
                <span>
                  <strong>{l.item}:</strong> {l.message}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={processItem}
            disabled={!datePeremption || processing}
            className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400"
          >
            {processing ? "Traitement..." : "Valider"}
          </button>
          <button
            onClick={onCancel}
            className="px-6 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvoirModal;
