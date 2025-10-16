import { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./header";
import FacturePDF from "./FacturePDF";
import ClientModal from "./ClientModal";
import AvoirModal from "./AvoirModal";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

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
    fetch("http://localhost:7194/api/Medicines")
      .then((res) => res.json())
      .then((data) => {
        const list: Medicine[] = data.filter(
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
      const existing = prev.find((c) => c.id === medicine.id);
      if (existing) {
        return prev.map((c) =>
          c.id === medicine.id ? { ...c, quantite: c.quantite + 1 } : c
        );
      }
      return [...prev, { ...medicine, quantite: 1 }];
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

    const matches = products.filter((p) => String(p.code) === raw);

    if (matches.length === 0) {
      await Swal.fire({
        icon: "error",
        title: "Produit introuvable",
        text: `Aucun produit trouvé pour le code-barres ${raw}`,
        confirmButtonColor: "#d33",
      });
    } else if (matches.length === 1) {
      addToCart(matches[0], raw);
      await Swal.fire({
        icon: "success",
        title: "Produit ajouté",
        text: `${matches[0].nom_medicament} a été ajouté au panier.`,
        timer: 1200,
        showConfirmButton: false,
      });
    } else {
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
        html: `<p class="mb-2">Choisissez la date de péremption :</p>${html}`,
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

  const total = cart.reduce((sum, c) => sum + c.ppv * c.quantite, 0);
  const totalarticle = cart.reduce((sum, c) => sum + c.quantite, 0);

  const confirmSale = () => setShowCodeModal(true);

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
      const response = await fetch("http://localhost:7194/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ventesData),
      });

      if (!response.ok) {
        alert("⚠️ Erreur lors de l'enregistrement de la vente");
        return;
      }

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

      if (
        typeVente.toLowerCase() === "crédit" ||
        typeVente.toLowerCase() === "credit"
      ) {
        await handleCreditUpdate(client, totalVente);
      }

      alert("✅ Vente enregistrée et stock mis à jour !");
      setCart([]);
    } catch (err) {
      console.error("Erreur:", err);
      alert("⚠️ Impossible de contacter le serveur");
    }
  };

  const handleCreditUpdate = async (client: string, montant: number) => {
    try {
      const creditUrl = "http://localhost:7194/api/credits";

      const existingResp = await fetch(creditUrl);
      if (!existingResp.ok) {
        console.error("Erreur fetch crédits");
        return;
      }

      const existingCredits = await existingResp.json();
      const existingClient = existingCredits.find(
        (c: any) => c.clientName.toLowerCase() === client.toLowerCase()
      );

      if (existingClient) {
        const updatedCredit = {
          ...existingClient,
          montantTotal: existingClient.montantTotal + montant,
        };

        await fetch(`${creditUrl}/${existingClient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCredit),
        });
      } else {
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
    } catch (err) {
      console.error("Erreur gestion crédit:", err);
      alert("⚠️ Erreur lors de la mise à jour du crédit client");
    }
  };

  const filteredProducts = products.filter((m) =>
    m.nom_medicament.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
      <Header titre="Gestion de Ventes" />

      {/* Search & Barcode Inputs */}
      <div className="p-4 flex items-center gap-3">
        <input
          ref={searchInputRef}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="🔍 Nom, Forme, PPV (Enter to add)"
          className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <input
          ref={barcodeInputRef}
          value={barcodeText}
          placeholder="🔍 Code (scan here)"
          onKeyDown={handleBarcodeKeyDown}
          onPaste={handleBarcodePaste}
          readOnly={false}
          onChange={() => {}}
          className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <button
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg font-semibold shadow-md transition"
          onClick={() => {
            const filtered = products.filter((p) =>
              p.nom_medicament.toLowerCase().includes(searchText.toLowerCase())
            );
            if (filtered.length === 1) addToCart(filtered[0]);
            else if (filtered.length === 0) alert("Aucun produit trouvé");
            else alert("Plusieurs produits trouvés, précisez la recherche");
          }}
        >
          + Ajouter
        </button>

        <button
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-semibold shadow-md transition"
          onClick={confirmSale}
        >
          Confirmer
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex gap-6 px-4">
        {/* Products Table */}
        <div className="w-2/3">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full">
                <thead className="bg-emerald-500 text-white sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">CODE</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Désignation
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Forme</th>
                    <th className="px-4 py-3 text-left font-semibold">PPV</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Présentation
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Péremption
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((m, i) => (
                    <tr
                      key={i}
                      className="hover:bg-emerald-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {m.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {m.nom_medicament}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {m.forme}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {m.ppv} DH
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {m.presentation}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {m.quantite}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {m.datE_PER}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-1 rounded shadow transition"
                          onClick={() => addToCart(m, String(m.code))}
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Total Display - Pro & Simple */}
        <div className="w-1/3">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-emerald-600">
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Articles
                </p>
                <p className="text-4xl font-bold text-gray-900">
                  {totalarticle}
                </p>
              </div>
              <div className="border-t-2 border-gray-100"></div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Total
                </p>
                <p className="text-5xl font-bold text-emerald-600">
                  {total.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 font-medium mt-1">MAD</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="px-4 mt-6">
        <h2 className="mb-3 font-bold text-xl text-gray-800">
          🛒 Panier de Vente
        </h2>

        <div className="flex gap-6">
          {/* Cart Table */}
          <div className="w-2/3">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full">
                  <thead className="bg-gray-700 text-white sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Désignation
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Quantité
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Prix
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cart.map((c, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {c.nom_medicament}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">
                          {c.quantite}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                          {(c.ppv * c.quantite).toFixed(2)} DH
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                              onClick={() => removeFromCart(c.nom_medicament)}
                            >
                              🗑
                            </button>
                            <button
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-sm transition"
                              onClick={() =>
                                adjustQuantity(c.nom_medicament, +1)
                              }
                            >
                              +
                            </button>
                            <button
                              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition"
                              onClick={() =>
                                adjustQuantity(c.nom_medicament, -1)
                              }
                            >
                              -
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="w-1/3 space-y-3">
            <input
              type="text"
              placeholder="Nom du patient"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Code / Barcode"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />

            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition shadow-md"
              onClick={() => setClientModalOpen(true)}
            >
              Vente Crédit
            </button>
            <button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition shadow-md"
              onClick={() => handleVente("TPE", "Aucun")}
            >
              Vente TPE
            </button>
            <button
              ref={venteEspecesRef}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-semibold transition shadow-md"
              onClick={() => handleVente("Especes", "Aucun")}
            >
              ✅ Vente Espèces
            </button>
            <button
              onClick={() => setShowAvoirModal(true)}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg font-semibold transition shadow-md"
            >
              Traiter Avoir
            </button>

            <FacturePDF
              cart={cart}
              total={total}
              totalArticle={totalarticle}
              patientName="Mazine SABRI"
              Pharmacien="Dr RABAB SABRI"
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSelectClient={(name) => {
          setSelectedClient(name);
          handleVente("Crédit", name);
        }}
      />

      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Entrez le code pour confirmer
            </h2>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className="border border-gray-300 p-3 w-full mb-4 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Code..."
            />
            <div className="flex justify-end gap-2">
              <button
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-semibold transition"
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
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-5 py-2 rounded-lg font-semibold transition"
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
          utilisateur={utilisateur}
          onComplete={() => {
            setShowAvoirModal(false);
            setCart([]);
          }}
          onCancel={() => setShowAvoirModal(false)}
        />
      )}
    </div>
  );
}
