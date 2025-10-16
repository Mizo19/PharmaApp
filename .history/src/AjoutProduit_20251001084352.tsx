import { Button } from "flowbite-react";
import Header from "./header"; // Make sure the filename matches

export default function AjoutProduit() {
  return (
    <div className="p-6 flex flex-col space-y-4">
      <Header utilisateur="Gestion Produits" titre="Produits" />

      <div className="fw-bold text-dark ">Ajout d'un Nouveau Produit</div>

      <input
        type="text"
        name="codeBarre"
        placeholder="Entrer le code barre du médicament"
        className="border rounded p-2 w-1/4"
      />

      <input
        type="text"
        name="designation"
        placeholder="Entrer la désignation du médicament"
        className="border rounded p-2 w-1/4"
      />

      <input
        type="date"
        name="datePeremption"
        placeholder="Entrer la date de péremption"
        className="border rounded p-2 w-1/4"
      />

      <input
        type="number"
        name="ppv"
        placeholder="Entrer le PPV"
        className="border rounded p-2 w-1/4"
      />

      <input
        type="text"
        name="presentation"
        placeholder="Présentation"
        className="border rounded p-2 w-1/4"
      />

      <input
        type="text"
        name="forme"
        placeholder="Forme"
        className="border rounded p-2 w-1/4"
      />

      <Button className="w-1/4 bg-red-700">Confirmer</Button>
    </div>
  );
}
