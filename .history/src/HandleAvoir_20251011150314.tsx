import axios from "axios";

// Define Medicine type (reuse the one from your App)
export type Medicine = {
  id?: number;
  code?: string;
  nom_medicament: string;
  forme?: string;
  ppv?: number;
  presentation?: string;
  datE_PER?: string;
  quantite?: number;
};

/**
 * Handle a medicine return (avoir)
 * @param {Medicine[]} medicines - Existing medicines list
 * @param {(meds: Medicine[]) => void} setMedicines - State setter for medicines
 */
export async function handleAvoir(
  medicines: Medicine[],
  setMedicines: (meds: Medicine[]) => void
) {
  try {
    const medName = prompt("Nom du médicament retourné :");
    if (!medName) {
      alert("❌ Nom invalide");
      return;
    }

    const med = medicines.find(
      (m) => m.nom_medicament.toLowerCase() === medName.toLowerCase()
    );

    if (med) {
      const qtyStr = prompt(`Quantité retournée pour ${med.nom_medicament} :`);
      const qty = parseInt(qtyStr || "0", 10);
      if (isNaN(qty) || qty <= 0) {
        alert("❌ Quantité invalide");
        return;
      }

      // Update backend stock
      if (med.id) {
        await axios.patch(
          `http://localhost:7194/api/medicines/updateStock/${med.id}`,
          qty // positive value to add to stock
        );
      }

      // Update local list
      const updated = medicines.map((m) =>
        m.id === med.id ? { ...m, quantite: (m.quantite || 0) + qty } : m
      );

      setMedicines(updated);
      alert(`✅ Stock mis à jour : +${qty} ${med.nom_medicament}`);
    } else {
      // Medicine doesn't exist — add new entry
      const ppv = parseFloat(prompt("PPV (prix unitaire) :") || "0");
      const forme = prompt("Forme (comprimé, sirop, etc.) :") || "";
      const datePeremption = prompt("Date de péremption (MMYYYY) :") || "N/A";
      const quantite = parseInt(prompt("Quantité :") || "0", 10);

      if (!quantite || quantite <= 0) {
        alert("❌ Quantité invalide");
        return;
      }

      const newMed: Medicine = {
        code: "",
        nom_medicament: medName,
        forme,
        ppv,
        presentation: "",
        datE_PER: datePeremption,
        quantite,
      };

      // Send to backend
      await axios.post("http://localhost:7194/api/medicines", newMed);

      const updated = [...medicines, newMed];
      setMedicines(updated);
      alert(`✅ Nouveau produit ajouté : ${medName}`);
    }
  } catch (err) {
    console.error("Erreur Avoir:", err);
    alert("⚠️ Erreur lors de la mise à jour du stock");
  }
}
