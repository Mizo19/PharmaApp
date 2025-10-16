// src/HandleAvoir.tsx
import Swal from "sweetalert2";
import type { Medicine } from "./types";

export const handleAvoir = async (
  cart: (Medicine & { quantite: number })[],
  setProducts: React.Dispatch<React.SetStateAction<Medicine[]>>
) => {
  if (cart.length === 0) {
    Swal.fire("Le panier est vide !", "", "warning");
    return;
  }

  const newProducts = [...(await fetchProducts())]; // fetch current stock if needed

  for (const item of cart) {
    // Ask pharmacist for the expiry date (MMYYYY)
    const { value: datE_PER } = await Swal.fire({
      title: `Date de péremption pour ${item.nom_medicament}`,
      input: "text",
      inputLabel: "MMYYYY",
      inputPlaceholder: "Ex: 092026",
      showCancelButton: true,
      inputValidator: (val) => {
        if (!val) return "Veuillez entrer une date valide";
        if (!/^(0[1-9]|1[0-2])\d{4}$/.test(val))
          return "Format invalide (MMYYYY)";
        return null;
      },
    });

    if (!datE_PER) continue; // skip if cancelled

    // Check if medicine already exists with same expiry
    const existingIndex = newProducts.findIndex(
      (m) => m.id === item.id && m.datE_PER === datE_PER
    );

    if (existingIndex >= 0) {
      // Increase quantity
      newProducts[existingIndex].quantite =
        (newProducts[existingIndex].quantite || 0) + item.quantite;
    } else {
      // Add new line with new expiry
      newProducts.push({
        ...item,
        datE_PER,
      });
    }
  }

  // Update state
  setProducts(newProducts);

  Swal.fire("Avoir traité ✅", "Le stock a été mis à jour.", "success");
};

// Optional: fetch products from API if you want real-time stock
async function fetchProducts(): Promise<Medicine[]> {
  try {
    const res = await fetch("http://localhost:7194/api/Medicines");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Erreur fetch stock:", err);
    return [];
  }
}
