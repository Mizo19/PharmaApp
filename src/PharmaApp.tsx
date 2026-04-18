import { useEffect,useRef, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./header";
import FacturePDF from "./FacturePDF";
import ClientModal from "./ClientModal";
import AvoirModal from "./AvoirModal";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useNavigate } from "react-router-dom";

import { Box, Button, Stack, TextField } from "@mui/material";
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
  reduction?: number;
};

type CartItem = Medicine & { quantite: number };

export default function App() {

 const navigate = useNavigate(); 
  const handleAjoutProduit = () => navigate("/ajout-produit");
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
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const barcodeBuffer = useRef<string>("");
  const scanTimeout = useRef<number | null>(null);
  const lastScanRef = useRef<{ code: string; ts: number } | null>(null);
  const PROCESS_DEBOUNCE_MS = 80;

 const [patientName, setPatientName] = useState(""); // state to hold input value

   const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPatientName(event.target.value);
  };

  useEffect(() => {
    localStorage.setItem("pharmaCart", JSON.stringify(cart));
  }, [cart]);
useEffect(() => {
  if (showCodeModal) {
    const t = setTimeout(() => {
      codeInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }
}, [showCodeModal]);
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
  const updateDiscount = (nomMedicament: string, newDiscount: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.nom_medicament === nomMedicament
          ? { ...item, reduction: isNaN(newDiscount) ? 0 : newDiscount }
          : item
      )
    );
  };
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

  const processBarcodeBuffer = async () => {
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

    // 🔍 Find all products matching this barcode
    const matches = products.filter((p) => String(p.code) === raw);

    if (matches.length === 0) {
      await Swal.fire({
        icon: "error",
        title: "Produit introuvable",
        text: `Aucun produit trouvé pour le code-barres ${raw}`,
        confirmButtonColor: "#d33",
      });
    } else if (matches.length === 1) {
      // ✅ Single match → add directly
      addToCart(matches[0], raw);
      await Swal.fire({
        icon: "success",
        title: "Produit ajouté",
        text: `${matches[0].nom_medicament} a été ajouté au panier.`,
        timer: 1200,
        showConfirmButton: false,
      });
    } else {
      // ⚠️ Multiple matches (same code, diff expiry dates)
      const html = matches
        .map(
          (m, i) => `
        <button id="select-${i}" 
          class="swal2-confirm swal2-styled" 
          style="width:100%; margin:5px 0; background:#4CAF50;">
          ${m.nom_medicament} — ${
            m.datE_PER ? `Péremption: ${m.datE_PER}` : "Sans date"
          }
        </button>
      `
        )
        .join("");

      await Swal.fire({
        title: "Plusieurs produits trouvés",
        html: `
        <p class="mb-2">Choisissez la date de péremption :</p>
        ${html}
      `,
        showConfirmButton: false,
        didOpen: () => {
          matches.forEach((m, i) => {
            const btn = document.getElementById(`select-${i}`);
            if (btn) {
              btn.addEventListener("click", async () => {
                addToCart(m, raw);
                Swal.close();
                await Swal.fire({
                  icon: "success",
                  title: "Ajouté au panier",
                  text: `${m.nom_medicament} (${
                    m.datE_PER || "sans date"
                  }) ajouté.`,
                  timer: 1200,
                  showConfirmButton: false,
                });
              });
            }
          });
        },
      });
    }

    // Reset buffer after handling
    barcodeBuffer.current = "";
    setBarcodeText("");
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



  const total = cart.reduce(
    (sum, c) => sum + c.ppv * c.quantite * (1 - (c.reduction || 0) / 100),
    0
  );
  const totalarticle = cart.reduce((sum, c) => sum + c.quantite, 0);

  const confirmSale = () => setShowCodeModal(false);

  // 🔹 Fonction principale : vente (Espèces ou Crédit)
const handleVente = async (typeVente: string, client: string) => {
  if (cart.length === 0) {
    alert("Le panier est vide !");
    return;
  }

  const totalVente = cart.reduce(
    (sum, item) => sum + item.quantite * item.ppv,
    0
  );

  const ventesData = cart.map((item) => ({
    date: new Date().toISOString(),
    medicineId: item.id,
    medicines: item.nom_medicament,
    totalArticles: item.quantite,
    totalPrice: item.quantite * item.ppv,
    typeDeVente: typeVente,
    numeroDeVente: 0,
    nomClient: client,
    responsable_Vente: utilisateur,
    quantiteVendue: item.quantite,
  }));

  try {
    // 1️⃣ Enregistrer la vente
    const response = await fetch("http://localhost:7194/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ventesData),
    });

    if (!response.ok) {
      alert("⚠️ Erreur lors de l'enregistrement de la vente");
      return;
    }

    // 2️⃣ Mise à jour du stock
    for (const item of cart) {
      await fetch(
        `http://localhost:7194/api/medicines/updateStock/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.quantite),
        }
      );
    }

    // 3️⃣ Si c’est une vente à crédit → appel de la fonction de crédit
    if (
      typeVente.toLowerCase() === "crédit" ||
      typeVente.toLowerCase() === "credit"
    ) {
      await handleCreditUpdate(client, totalVente);
    }

    // 4️⃣ 🧹 Nettoyage des doublons (supprime les lignes avec DATE_PER vide)
    await fetch("http://localhost:7194/api/medicines/cleanupDuplicates", {
      method: "POST",
    });
// 5️⃣ Confirmation visuelle
    await Swal.fire({
      icon: "success",
      title: "✅ Vente enregistrée",
      text: "Le stock a été mis à jour et les doublons ont été nettoyés !",
     
    });

    
    setCart([]);
  } catch (err) {
    await Swal.fire({
      icon: "error",
      title: "Erreur",
      text: "Impossible de se connecter à la base de données",
      confirmButtonText: "OK",
      confirmButtonColor: "#2563eb",
    });
  }

  confirmSale();
};

  // 🔹 Fonction séparée : mise à jour/création du crédit
const handleCreditUpdate = async (client: string, montant: number) => {
  try {
    const creditUrl = "http://localhost:7194/api/credits";

    // Récupération des crédits existants
    const existingResp = await fetch(creditUrl);
    if (!existingResp.ok) return;

    const existingCredits = await existingResp.json();
    console.log(client);

    // Recherche du client existant (insensible à la casse)
    const existingClient = existingCredits.find(
      (c: any) => c.clientName.toLowerCase() === client.toLowerCase()
    );

    if (existingClient) {
      // Client existant → mise à jour
      const updatedCredit = {
        ...existingClient,
        montantTotal: Number(existingClient.montantTotal) + montant,
        montantRestant:( existingClient.montantRestant ?? 0) + montant,
        estPaye: false,
        dateCreation: existingClient.dateCreation,
      };

      await fetch(`${creditUrl}/${existingClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCredit),
      });
    } else {
      // Nouveau client
      const newCredit = {
        clientName: client,
        montantTotal: montant,
        montantRestant: 0,
        dateCreation: new Date().toISOString(),
        estPaye: false,
      };

      await fetch(creditUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCredit),
      });
    }
  } catch {
    // Erreur silencieuse côté client
  }
};



  return (
    <div className="h-screen bg-gray-100 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100">
      <Header titre="Gestion de Ventes" />

      {/* Inputs */}
      <div className="p-4 flex items-center gap-3">
          <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold shadow-md"
          
          onClick={handleAjoutProduit}
        >
          + Ajouter Produit
        </button>
   

        <input
          ref={barcodeInputRef}
          value={barcodeText}
          placeholder="🔍 Code (scan here) F4"
          onKeyDown={handleBarcodeKeyDown}
          onPaste={handleBarcodePaste}
          readOnly={false}
          onChange={() => {}}
          className="flex-1 p-3 w-1/4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

          <input
          ref={searchInputRef}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="🔍 Nom, Forme, PPV (Enter to add) F2"
          className="flex-1 p-3 w-1/4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

       
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

        <div className="backdrop-blur-lg bg-white/30 rounded-2xl shadow-xl p-5 border border-white/50">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-medium mb-1">
                Total Articles
              </p>
              <p className="text-4xl font-bold text-gray-900">{totalarticle}</p>
            </div>
            <div className="w-1 h-16 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-medium mb-1">Total</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {total.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 font-semibold">MAD</p>
            </div>
          </div>
        </div>
      </div>
      <h2 className="mb-2 font-bold text-lg">🛒 Tableau de Vente</h2>

      <div className="flex w-3/2 gap-4">
        {/* Table Section */}
        <div className="flex-1 max-h-[300px] overflow-auto rounded-lg">
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell className="hidden">ID</TableHeadCell>
                <TableHeadCell>Désignation</TableHeadCell>
                <TableHeadCell>Quantité</TableHeadCell>
                <TableHeadCell>Prix</TableHeadCell>
                <TableHeadCell>Réduction (%)</TableHeadCell>
                <TableHeadCell>Total</TableHeadCell>
                <TableHeadCell>Action</TableHeadCell>
              </TableRow>
            </TableHead>

            <TableBody className="divide-y">
              {cart.map((c, i) => (
                <TableRow key={i} className="bg-white hover:bg-gray-50">
                  <TableCell className="hidden">{c.id}</TableCell>
                  <TableCell>{c.nom_medicament}</TableCell>
                  <TableCell>{c.quantite}</TableCell>
                  <TableCell>{c.ppv.toFixed(2)} DH</TableCell>

                  {/* Réduction */}
                  <TableCell>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={c.reduction || 0}
                      onChange={(e) =>
                        updateDiscount(
                          c.nom_medicament,
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-16 border border-gray-300 rounded text-center text-sm py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </TableCell>

                  {/* Total après réduction */}
                  <TableCell>
                    {(
                      c.ppv *
                      c.quantite *
                      (1 - (c.reduction || 0) / 100)
                    ).toFixed(2)}{" "}
                    DH
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex space-x-2">
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow-sm transition"
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
              <TextField label="Nom du patient" size="small"     value={patientName} 
        onChange={handleChange}   fullWidth />
              <TextField label="Code / Barcode" size="small" fullWidth />
            </Stack>

            {/* Buttons */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleVente("Especes", "Aucun")}
                ref={venteEspecesRef}
              >
                ✅ Vente Espèces F3
              </Button>
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
                onClick={() => handleVente("TPE", "Aucun")}
              >
                Vente TPE
              </Button>
              
              <button
                onClick={() => setShowAvoirModal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              >
                Traiter Avoir
              </button>
            </Stack>

            {/* Summary */}
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-600">
              <div className="flex items-center justify-between text-gray-800">
                <span className="text-lg">
                  <span className="font-semibold">{totalarticle}</span> Articles
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {total.toLocaleString()} MAD
                </span>
              </div>
            </div>
            {/* PDF */}
            <FacturePDF
              cart={cart}
              total={total}
              totalArticle={totalarticle}
              patientName={patientName}
              Pharmacien="Pharmacie El Abawain"
            />
          </Box>
        </div>
      </div>
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSelectClient={(name) => {
          setSelectedClient(name); // Save the client
          handleVente("Crédit", name); // Immediately call your sale handler
        }}
      />
      {/* Modal */}
{showCodeModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
      <h2 className="text-lg font-bold mb-4 text-gray-800">
        Entrez le code d’accès pour confirmer la vente
      </h2>

      {/* Champ de code */}
      <input
       ref={codeInputRef} // 👈 AJOUT ICI
        type="password"
        value={codeInput}
        onChange={(e) => setCodeInput(e.target.value)}
     onKeyDown={async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const btn = document.getElementById("validateButton");
    if (btn) (btn as HTMLButtonElement).click();
  }
}}
        className="border p-2 w-full mb-4 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        placeholder="••••••••"
      />

      {/* Boutons */}
      <div className="flex justify-end space-x-2">
        <button
          id="validateButton"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={async () => {
            try {
              const res = await fetch("http://localhost:7194/api/utilisateurs");
              if (!res.ok) throw new Error("Erreur serveur");
              const data = await res.json();

             const user = data.find((u: any) => u.motDePasse === codeInput.trim());

              if (user) {
                localStorage.setItem("connectedUser", user.nomUtilisateur);
                localStorage.setItem("isAdmin", user.isAdmin ? "true" : "false");

                setUtilisateur(user.nomUtilisateur);
                setShowCodeModal(false);
                setCart([]);
                setCodeInput("");
              } else {
                alert("Code incorrect !");
              }
            } catch (err) {
              alert("Erreur de connexion au serveur");
            }
          }}
        >
          Valider
        </button>

        <button
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition"
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
