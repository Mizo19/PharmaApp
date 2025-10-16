\import Swal from "sweetalert2";

export type Medicine = {
  id: number; // id is required
  code?: string;
  nom_medicament?: string;
  forme?: string;
  ppv?: number;
  presentation?: string;
  datE_PER?: string; // MMYYYY
  quantite?: number;
};

type CartItem = Medicine & { quantite: number };

export const handleAvoir = async (
  cart: CartItem[],
  setProducts: (meds: Medicine[]) => void
) => {
  if (cart.length === 0) {
    Swal.fire("⚠️ Panier vide", "Il n'y a aucun médicament à traiter.", "warning");
    return;
  }

  // On va parcourir chaque médicament du panier
  for (const item of cart) {
    const { id, nom_medicament, quantite } = item;
    if (!id) continue;

    // Demander la date de péremption pour le retour
    const { value: newDatePer } = await Swal.fire({
      title: `Date de péremption pour "${nom_medicament}"`,
      input: "text",
      inputLabel: "Entrez la nouvelle date (MMYYYY)",
      inputPlaceholder: "MMYYYY",
      inputValue: item.datE_PER || "",
      showCancelButton: true,
    });

    if (!newDatePer) continue; // Si annulé, passer au suivant

    // Mise à jour du stock côté front
    setProducts((prev) => {
      // Chercher un produit existant avec même id ET même datE_PER
      const existingIndex = prev.findIndex(
        (p) => p.id === id && p.datE_PER === newDatePer
      );

      if (existingIndex >= 0) {
        // Si trouvé, augmenter la quantité
        const updated = [...prev];
        updated[existingIndex].quantite =
          (updated[existingIndex].quantite || 0) + (quantite || 0);
        return updated;
      } else {
        // Sinon, créer une nouvelle ligne avec nouvelle datE_PER
        return [
          ...prev,
          {
            ...item,
            datE_PER: newDatePer,
          },
        ];
      }
    });
  }

  Swal.fire("✅ Avoir traité", "Le stock a été mis à jour.", "success");
};
