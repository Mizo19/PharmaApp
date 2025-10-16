import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./header";
import FacturePDF from "./FacturePDF";
import ClientModal from "./ClientModal";
import AvoirModal from "./AvoirModal";

import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

// 🔧 Fix AZERTY symbols to digits

const fixFrenchAZERTYBarcode = (input: string): string => {
  const map: Record<string, string> = {
    "&": "1",
    é: "2",
    '"': "3",
    "'": "4",
    "(": "5",
    "-": "6",
    è: "7",
    _: "8",
    ç: "9",
    à: "0",
  };

  return input
    .split("")
    .map((ch) => map[ch] || ch)
    .join("");
};

type Medicine = {
  id: number;
  code: string;
  nom_medicament: string;
  forme: string;
  ppv: number;
  presentation?: string;
  expiry?: string;
  datE_PER?: string;
  quantite?: number;
};

type CartItem = Medicine & { quantite: number };

export default function App() {
  const [showAvoirModal, setShowAvoirModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [barcodeText, setBarcodeText] = useState("");
  const [products, setProducts] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("pharmaCart");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      console.error("Failed to load cart from localStorage");
      return [];
    }
  });
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [utilisateur, setUtilisateur] = useState(" Rabab");
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [_selectedClient, setSelectedClient] = useState("Aucun");

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const venteEspecesRef = useRef<HTMLButtonElement | null>(null);

  const barcodeBuffer = useRef<string>("");
  const scanTimeout = useRef<number | null>(null);
  const lastScanRef = useRef<{ code: string; ts: number } | null>(null);
  const PROCESS_DEBOUNCE_MS = 80;

  useEffect(() => {
    localStorage.setItem("pharmaCart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    axios
      .get("http://localhost:7194/api/Medicines")
      .then((res) => {
        const list: Medicine[] = res.data.filter(
          (p: Medicine) => p && p.code && String(p.code).trim() !== ""
        );
        setProducts(list);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cart.length > 0) {
        e.preventDefault();
        e.returnValue =
          "Vous avez une vente en cours. Voulez-vous vraiment quitter ?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [cart]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
    const onGlobalKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F3") {
        e.preventDefault();
        venteEspecesRef.current?.click();
      } else if (e.key === "F4") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  const addToCart = (medicine: Medicine, sourceCode?: string) => {
    if (!medicine || !medicine.nom_medicament?.trim()) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.id === medicine.id); // 🔹 comparer par id
      if (existing) {
        return prev.map((c) =>
          c.id === medicine.id ? { ...c, quantite: c.quantite + 1 } : c
        );
      }
      return [...prev, { ...medicine, quantite: 1 }]; // 🔹 id est inclus automatiquement
    });

    try {
      const beep = new Audio("/beep.mp3");
      void beep.play();
    } catch {}

    if (sourceCode) {
      lastScanRef.current = { code: sourceCode, ts: Date.now() };
    }

    setSearchText("");
    setBarcodeText("");
    barcodeBuffer.current = "";
    if (scanTimeout.current) {
      window.clearTimeout(scanTimeout.current);
      scanTimeout.current = null;
    }
    barcodeInputRef.current?.focus();
  };

  const adjustQuantity = (nom_medicament: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.nom_medicament === nom_medicament
            ? { ...item, quantite: Math.max(0, item.quantite + delta) }
            : item
        )
        .filter((it) => it.quantite > 0)
    );
  };

  const removeFromCart = (nom_medicament: string) =>
    setCart((prev) => prev.filter((c) => c.nom_medicament !== nom_medicament));

  const processBarcodeBuffer = () => {
    const rawInput = barcodeBuffer.current.trim();
    const raw = fixFrenchAZERTYBarcode(rawInput);

    if (!raw) {
      barcodeBuffer.current = "";
      setBarcodeText("");
      return;
    }

    const last = lastScanRef.current;
    if (last && last.code === raw && Date.now() - last.ts < 800) {
      barcodeBuffer.current = "";
      setBarcodeText("");
      return;
    }

    const match = products.find((p) => String(p.code) === raw);
    if (match) {
      addToCart(match, raw);
    } else {
      setBarcodeText(rawInput); // Show raw input (for user)
      barcodeBuffer.current = "";
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Delete") {
      e.preventDefault();
      const last = cart[cart.length - 1];
      if (!last) return;
      if (e.key === "ArrowUp") adjustQuantity(last.nom_medicament, +1);
      if (e.key === "ArrowDown") adjustQuantity(last.nom_medicament, -1);
      if (e.key === "Delete") removeFromCart(last.nom_medicament);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (scanTimeout.current) {
        window.clearTimeout(scanTimeout.current);
        scanTimeout.current = null;
      }
      processBarcodeBuffer();
      return;
    }

    if (e.key.length === 1) {
      barcodeBuffer.current += e.key;
      if (scanTimeout.current) {
        window.clearTimeout(scanTimeout.current);
      }
      scanTimeout.current = window.setTimeout(() => {
        scanTimeout.current = null;
        processBarcodeBuffer();
      }, PROCESS_DEBOUNCE_MS);
    }
  };

  const handleBarcodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted) return;
    barcodeBuffer.current = pasted;
    processBarcodeBuffer();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const txt = searchText.trim().toLowerCase();
    if (!txt) return;
    let match = products.find(
      (p) => p.nom_medicament?.trim().toLowerCase() === txt
    );
    if (!match) {
      const matches = products.filter((p) =>
        p.nom_medicament?.toLowerCase().includes(txt)
      );
      if (matches.length === 1) match = matches[0];
      else if (matches.length > 1) {
        alert("Plusieurs produits trouvés, veuillez préciser !");
        return;
      }
    }
    if (match) addToCart(match);
  };

  const total = cart.reduce((sum, c) => sum + c.ppv * c.quantite, 0);
  const totalarticle = cart.reduce((sum, c) => sum + c.quantite, 0);

  const confirmSale = () => setShowCodeModal(true);

  const handleVenteEspeces = async (typeVente: string, client: string) => {
    if (cart.length === 0) {
      alert("Le panier est vide !");
      return;
    }

    // Construire un tableau d’objets conforme au modèle C#
    const ventesData = cart.map((item) => ({
      date: new Date().toISOString(), // Date de la vente
      medicineId: item.id, // 🔹 ID unique pour identifier le médicament
      medicines: item.nom_medicament, // Nom du médicament
      totalArticles: item.quantite, // Quantité vendue
      totalPrice: item.quantite * item.ppv, // Prix total
      typeDeVente: typeVente, // Type de vente
      numeroDeVente: 0, // Numéro de vente (auto ou backend)
      nomClient: client, // Nom du client
      responsable_Vente: utilisateur, // Pharmacien / vendeur
      quantiteVendue: item.quantite, // Quantité à déduire du stock
    }));

    try {
      // 1️⃣ Enregistrement de la vente
      const response = await fetch("http://localhost:7194/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ventesData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Erreur API:", error);
        alert("⚠️ Erreur lors de l'enregistrement de la vente");
        return;
      }

      // 2️⃣ Mise à jour du stock pour chaque médicament
      for (const item of cart) {
        const stockResp = await fetch(
          `http://localhost:7194/api/medicines/updateStock/${item.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.quantite), // quantité vendue
          }
        );

        if (!stockResp.ok) {
          console.error(`Erreur mise à jour stock pour ${item.nom_medicament}`);
        }
      }

      // ✅ Tout est OK
      alert("✅ Vente  enregistrée et stock mis à jour !");
      setCart([]); // vider le panier
    } catch (err) {
      console.error("Erreur fetch:", err);
      alert("⚠️ Impossible de contacter le serveur");
    }
  };

  return (
    <div className="h-screen bg-gray-100 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100">
      <Header utilisateur={utilisateur} titre="Gestion de Ventes" />

      {/* Inputs */}
      <div className="p-4 flex items-center gap-3">
        <input
          ref={searchInputRef}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="🔍 Nom, Forme, PPV (Enter to add)"
          className="flex-1 p-3 w-1/4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          ref={barcodeInputRef}
          value={barcodeText}
          placeholder="🔍 Code (scan here)"
          onKeyDown={handleBarcodeKeyDown}
          onPaste={handleBarcodePaste}
          readOnly={false}
          onChange={() => {}}
          className="flex-1 p-3 w-1/4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold shadow-md"
          onClick={() => {
            const filtered = products.filter((p) =>
              p.nom_medicament.toLowerCase().includes(searchText.toLowerCase())
            );
            if (filtered.length === 1) addToCart(filtered[0]);
            else if (filtered.length === 0) alert("Aucun produit trouvé");
            else alert("Plusieurs produits trouvés, précisez la recherche");
          }}
        >
          + Ajouter Produit
        </button>

        <button
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-semibold shadow-md"
          onClick={confirmSale}
        >
          Confirmer
        </button>
      </div>

      {/* Layout */}
      <div className="flex gap-6">
        <div className="w-2/3 max-h-[350px] overflow-auto rounded-lg">
          <span className="fw-bold">
            <Table
              hoverable
              className="rounded-lg overflow-hidden shadow-md border border-gray-200"
            >
              <TableHead className="bg-green-400">
                <TableRow>
                  <TableHeadCell className="text-gray-800 font-semibold px-4 py-2 rounded-tl-lg hidden">
                    ID
                  </TableHeadCell>
                  <TableHeadCell className="text-gray-800 font-semibold px-4 py-2 rounded-tl-lg">
                    CODE
                  </TableHeadCell>
                  <TableHeadCell className="text-gray-800 font-semibold px-4 py-2">
                    Désignation
                  </TableHeadCell>
                  <TableHeadCell className="text-gray-800 font-semibold px-4 py-2">
                    Forme
                  </TableHeadCell>
                  <TableHeadCell className="text-gray-800 font-semibold px-4 py-2">
                    PPV
                  </TableHeadCell>
                  <TableHeadCell className="text-gray-800 font-semibold px-4 py-2">
                    Présentation
                  </TableHeadCell>

                  <TableHeadCell className="text-gray-800 font-semibold px-4 py-2">
                    Qauntité
                  </TableHeadCell>
                  <TableHeadCell className="text-gray-800 font-semibold px-4 py-2">
                    Date Peremption
                  </TableHeadCell>
                  <TableHeadCell className="px-4 py-2 rounded-tr-lg"></TableHeadCell>
                </TableRow>
              </TableHead>

              <TableBody className="divide-y bg-gradient-to-b from-blue-50 to-blue-100">
                {products
                  .filter((m) =>
                    m.nom_medicament
                      .toLowerCase()
                      .includes(searchText.toLowerCase())
                  )
                  .map((m, i) => (
                    <TableRow
                      key={i}
                      className="hover:bg-blue-400 transition-colors"
                    >
                      <TableCell className="text-gray-900 font-semibold px-4 py-2 hidden">
                        {m.id}
                      </TableCell>
                      <TableCell className="text-gray-900 font-semibold px-4 py-2">
                        {m.code}
                      </TableCell>
                      <TableCell className="text-gray-800 px-4 py-2">
                        {m.nom_medicament}
                      </TableCell>
                      <TableCell className="text-gray-700 px-4 py-2">
                        {m.forme}
                      </TableCell>
                      <TableCell className="text-gray-900 font-bold px-4 py-2">
                        {m.ppv} DH
                      </TableCell>
                      <TableCell className="text-gray-700 px-4 py-2">
                        {m.presentation}
                      </TableCell>
                      <TableCell className="text-gray-700 px-4 py-2">
                        {m.quantite}
                      </TableCell>
                      <TableCell className="text-gray-700 px-4 py-2">
                        {m.datE_PER}
                      </TableCell>

                      <TableCell className="px-4 py-2">
                        <button
                          className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1 rounded shadow-md transition"
                          onClick={() => addToCart(m, String(m.code))}
                        >
                          +
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center space-y-8 max-w-md mx-auto">
          <div className="text-center">
            <h3 className="text-5xl font-medium text-gray-800 tracking-tight">
              Total:
            </h3>
            <p className="text-4xl font-extrabold text-black mt-2">
              {total.toFixed(2)} DH
            </p>
          </div>

          <div className="w-24 h-[2px] bg-gray-300 rounded-full"></div>

          <div className="text-center">
            <h3 className="text-5xl font-medium text-gray-800 tracking-tight">
              Nombre d’Articles:
            </h3>
            <p className="text-4xl font-extrabold text-black mt-2">
              {totalarticle}
            </p>
          </div>
        </div>
      </div>
      <h2 className="mb-2 font-bold text-lg">🛒 Tableau de Vente</h2>

      <div className="flex w-2/3 gap-4">
        {/* Table Section */}
        <div className="flex-1 max-h-[250px] overflow-auto rounded-lg">
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell className="Hidden">ID</TableHeadCell>
                <TableHeadCell>Désignation</TableHeadCell>
                <TableHeadCell>Quantité</TableHeadCell>
                <TableHeadCell>Prix</TableHeadCell>
                <TableHeadCell>Action</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {cart.map((c, i) => (
                <TableRow key={i} className="bg-white hover:bg-gray-50">
                  <TableCell className="Hidden">{c.id}</TableCell>
                  <TableCell>{c.nom_medicament}</TableCell>
                  <TableCell>{c.quantite}</TableCell>
                  <TableCell>{(c.ppv * c.quantite).toFixed(2)} DH</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <button
                        className="bg-green-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow-sm transition"
                        onClick={() => removeFromCart(c.nom_medicament)}
                      >
                        🗑 Sup
                      </button>
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm transition"
                        onClick={() => adjustQuantity(c.nom_medicament, +1)}
                      >
                        +
                      </button>
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm transition"
                        onClick={() => adjustQuantity(c.nom_medicament, -1)}
                      >
                        -
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Buttons Section */}
        <div className="flex flex-col gap-3">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}>
            {/* Inputs */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Nom du patient" size="small" fullWidth />
              <TextField label="Code / Barcode" size="small" fullWidth />
            </Stack>

            {/* Buttons */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setClientModalOpen(true)}
              >
                Vente Crédit
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleVenteEspeces("TPE", "Aucun")}
              >
                Vente TPE
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleVenteEspeces("Especes", "Aucun")}
              >
                ✅ Vente Espèces
              </Button>
              <button
                onClick={() => setShowAvoirModal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              >
                Traiter Avoir
              </button>
            </Stack>

            {/* Summary */}
            <Typography>
              Total Articles: {totalarticle} | Total: {total.toLocaleString()}{" "}
              MAD
            </Typography>

            {/* PDF */}
            <FacturePDF
              cart={cart}
              total={total}
              totalArticle={totalarticle}
              patientName="Mazine SABRI"
              Pharmacien="Dr RABAB SABRI"
            />
          </Box>
        </div>
      </div>
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSelectClient={(name) => {
          setSelectedClient(name); // Save the client
          handleVenteEspeces("Crédit", name); // Immediately call your sale handler
        }}
      />
      {/* Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">
              Entrez le code pour confirmer la vente
            </h2>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className="border p-2 w-full mb-4 rounded"
              placeholder="Code..."
            />
            <div className="flex justify-end space-x-2">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  if (codeInput === "1234") {
                    alert("Code correct, vente confirmée !");
                    setShowCodeModal(false);
                    setCart([]);
                    setCodeInput("");
                    setUtilisateur("Mazine");
                  } else {
                    alert("Code incorrect !");
                  }
                }}
              >
                Valider
              </button>
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={() => {
                  setShowCodeModal(false);
                  setCodeInput("");
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {showAvoirModal && (
        <AvoirModal
          cart={cart}
          utilisateur={utilisateur} // <-- pass the current pharmacist/user
          onComplete={() => {
            setShowAvoirModal(false);
            setCart([]); // optionally clear cart after processing
          }}
          onCancel={() => setShowAvoirModal(false)}
        />
      )}
    </div>
  );
}
