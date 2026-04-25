import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./header";
import FacturePDF from "./FacturePDF";
import ClientModal from "./ClientModal";
import AvoirModal from "./AvoirModal";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useNavigate } from "react-router-dom";

import { Box, Stack, TextField } from "@mui/material";
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
  const [utilisateur, setUtilisateur] = useState(
    () => (localStorage.getItem("connectedUser") || "Rabab").replace(/^"|"$/g, "").trim()
  );
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

  // 🔔 Alert pharmacist when price updates are pending (scraped vs DB)
  useEffect(() => {
    if (sessionStorage.getItem("priceAlertShown")) return;
    axios
      .get("http://localhost:7194/api/pricing/diff")
      .then(async (res) => {
        const s = res.data?.summary;
        if (!s) return;
        const changed = Number(s.changed || 0);
        const news = Number(s.new || 0);
        if (changed === 0 && news === 0) return;

        sessionStorage.setItem("priceAlertShown", "1");

        const result = await Swal.fire({
          title: "Mise à jour des prix disponible",
          html: `
            <div style="text-align:left; font-size:14px; line-height:1.6">
              Les données de <b>medicament.ma</b> contiennent :
              <ul style="margin:10px 0 0 20px; padding:0">
                <li><b style="color:#059669">${changed.toLocaleString()}</b> changement(s) de prix</li>
                <li><b style="color:#2563eb">${news.toLocaleString()}</b> nouveau(x) médicament(s)</li>
              </ul>
            </div>
          `,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Voir maintenant",
          cancelButtonText: "Plus tard",
          confirmButtonColor: "#059669",
          cancelButtonColor: "#64748b",
          reverseButtons: true,
        });
        if (result.isConfirmed) navigate("/MiseAJourPrix");
      })
      .catch(() => {
        /* diff file not ready yet — silently ignore */
      });
  }, [navigate]);
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

  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcodeText(value);
    barcodeBuffer.current = value;
    if (scanTimeout.current) {
      window.clearTimeout(scanTimeout.current);
    }
    if (!value) {
      scanTimeout.current = null;
      return;
    }
    scanTimeout.current = window.setTimeout(() => {
      scanTimeout.current = null;
      processBarcodeBuffer();
    }, PROCESS_DEBOUNCE_MS);
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

  // 🔹 KPIs for the home widgets
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    []
  );

  const initials = useMemo(() => {
    const n = (utilisateur || "?").trim();
    if (!n) return "?";
    const w = n.split(/\s+/);
    return (w.length === 1 ? w[0][0] : w[0][0] + w[w.length - 1][0]).toUpperCase();
  }, [utilisateur]);

  const visibleProducts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    const out: Medicine[] = [];
    for (let i = 0; i < products.length && out.length < 200; i++) {
      const name = products[i].nom_medicament;
      if (name && name.toLowerCase().includes(q)) out.push(products[i]);
    }
    return out;
  }, [products, searchText]);

  const stockStats = useMemo(() => {
    let enStock = 0;
    let lowStock = 0;
    let expSoon = 0;
    const now = new Date();
    const curYM = now.getFullYear() * 12 + now.getMonth();
    for (const p of products) {
      const q = p.quantite ?? 0;
      if (q > 0) enStock += 1;
      if (q > 0 && q <= 5) lowStock += 1;
      const d = p.datE_PER?.toString().trim();
      if (d && /^\d{5,6}$/.test(d)) {
        const year = parseInt(d.slice(-4), 10);
        const month = parseInt(d.slice(0, -4), 10);
        if (month >= 1 && month <= 12) {
          const ym = year * 12 + (month - 1);
          const diff = ym - curYM;
          if (q > 0 && diff <= 3) expSoon += 1;
        }
      }
    }
    return { enStock, lowStock, expSoon };
  }, [products]);

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
        montantRestant: montant,
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
    <div className="min-h-screen bg-slate-50">
      <Header titre="Gestion de Ventes" />

      {/* Widgets: greeting + KPIs */}
      <div className="max-w-[1600px] mx-auto px-6 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Greeting card */}
          <div className="md:col-span-1 relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-4 shadow-sm">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -right-10 -top-10 w-20 h-20 bg-white/5 rounded-full" />
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white text-emerald-700 flex items-center justify-center text-lg font-bold ring-2 ring-white/40 shadow-md shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-emerald-100/90 font-medium">
                  {greeting}
                </p>
                <p className="text-base font-semibold truncate">
                  {(utilisateur || "").trim() || "Utilisateur"}
                </p>
                <p className="text-[11px] text-emerald-100/80 capitalize">{todayLabel}</p>
              </div>
            </div>
          </div>

          {/* En stock */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
              📦
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Produits en stock
              </p>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                {stockStats.enStock.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Stock faible */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0">
              ⚠️
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Stock faible (≤5)
              </p>
              <p className="text-2xl font-semibold text-amber-600 tabular-nums">
                {stockStats.lowStock.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Péremption proche */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-lg shrink-0">
              ⏳
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Périment ≤ 3 mois
              </p>
              <p className="text-2xl font-semibold text-rose-600 tabular-nums">
                {stockStats.expSoon.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="max-w-[1600px] mx-auto px-6 pt-5 pb-3 flex items-center gap-3">
        <button
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
          onClick={handleAjoutProduit}
        >
          + Ajouter Produit
        </button>

        <input
          ref={barcodeInputRef}
          value={barcodeText}
          placeholder="Code-barres (F4)"
          onKeyDown={handleBarcodeKeyDown}
          onPaste={handleBarcodePaste}
          onChange={handleBarcodeChange}
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
        />

        <input
          ref={searchInputRef}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Rechercher nom, forme, PPV (F2)"
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
        />
      </div>

      {/* Layout */}
      <div className="max-w-[1600px] mx-auto px-6 flex gap-6">
        <div className="w-2/3 max-h-[350px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table hoverable className="rounded-xl overflow-hidden">
            <TableHead className="bg-slate-50">
              <TableRow>
                <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider px-4 py-3 hidden">
                  ID
                </TableHeadCell>
                <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider px-4 py-3">
                  Code
                </TableHeadCell>
                <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider px-4 py-3">
                  Désignation
                </TableHeadCell>
                <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider px-4 py-3">
                  Forme
                </TableHeadCell>
                <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider px-4 py-3">
                  PPV
                </TableHeadCell>
                <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider px-4 py-3">
                  Présentation
                </TableHeadCell>
                <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider px-4 py-3">
                  Qté
                </TableHeadCell>
                <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider px-4 py-3">
                  Péremption
                </TableHeadCell>
                <TableHeadCell className="px-4 py-3"></TableHeadCell>
              </TableRow>
            </TableHead>

            <TableBody className="divide-y divide-slate-100 bg-white">
              {visibleProducts.map((m) => (
                  <TableRow
                    key={m.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <TableCell className="text-slate-900 font-medium px-4 py-2.5 hidden">
                      {m.id}
                    </TableCell>
                    <TableCell className="text-slate-700 text-sm font-mono px-4 py-2.5">
                      {m.code}
                    </TableCell>
                    <TableCell className="text-slate-900 text-sm font-medium px-4 py-2.5">
                      {m.nom_medicament}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm px-4 py-2.5">
                      {m.forme}
                    </TableCell>
                    <TableCell className="text-slate-900 text-sm font-semibold px-4 py-2.5 tabular-nums">
                      {m.ppv} DH
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm px-4 py-2.5">
                      {m.presentation}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm px-4 py-2.5 tabular-nums">
                      {m.quantite}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm px-4 py-2.5">
                      {m.datE_PER}
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      <button
                        className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-semibold transition-colors flex items-center justify-center"
                        onClick={() => addToCart(m, String(m.code))}
                      >
                        +
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                Total Articles
              </p>
              <p className="text-4xl font-semibold text-slate-900 tabular-nums">
                {totalarticle}
              </p>
            </div>
            <div className="w-px h-16 bg-slate-200" />
            <div className="flex-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                Total
              </p>
              <p className="text-4xl font-semibold text-emerald-600 tabular-nums">
                {total.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">MAD</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 pt-6">
        <h2 className="mb-3 font-semibold text-[15px] text-slate-900 flex items-center gap-2">
          <span className="w-1 h-4 bg-emerald-500 rounded-full" />
          Tableau de Vente
        </h2>

        <div className="flex gap-6">
          {/* Table Section */}
          <div className="flex-1 max-h-[300px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table hoverable>
              <TableHead className="bg-slate-50">
                <TableRow>
                  <TableHeadCell className="hidden">ID</TableHeadCell>
                  <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                    Désignation
                  </TableHeadCell>
                  <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                    Quantité
                  </TableHeadCell>
                  <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                    Prix
                  </TableHeadCell>
                  <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                    Réduction
                  </TableHeadCell>
                  <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                    Total
                  </TableHeadCell>
                  <TableHeadCell className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                    Action
                  </TableHeadCell>
                </TableRow>
              </TableHead>

              <TableBody className="divide-y divide-slate-100">
                {cart.map((c, i) => (
                  <TableRow key={i} className="bg-white hover:bg-slate-50 transition-colors">
                    <TableCell className="hidden">{c.id}</TableCell>
                    <TableCell className="text-slate-900 text-sm font-medium">
                      {c.nom_medicament}
                    </TableCell>
                    <TableCell className="text-slate-700 text-sm tabular-nums">
                      {c.quantite}
                    </TableCell>
                    <TableCell className="text-slate-700 text-sm tabular-nums">
                      {c.ppv.toFixed(2)} DH
                    </TableCell>

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
                        className="w-16 border border-slate-200 rounded-md text-center text-sm py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      />
                    </TableCell>

                    <TableCell className="text-slate-900 text-sm font-semibold tabular-nums">
                      {(
                        c.ppv *
                        c.quantite *
                        (1 - (c.reduction || 0) / 100)
                      ).toFixed(2)}{" "}
                      DH
                    </TableCell>

                    <TableCell>
                      <div className="flex gap-1.5">
                        <button
                          className="w-8 h-8 rounded-md bg-red-50 hover:bg-red-600 text-red-600 hover:text-white text-sm transition-colors flex items-center justify-center"
                          onClick={() => removeFromCart(c.nom_medicament)}
                          title="Supprimer"
                        >
                          ×
                        </button>
                        <button
                          className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-700 text-slate-700 hover:text-white text-sm font-semibold transition-colors flex items-center justify-center"
                          onClick={() => adjustQuantity(c.nom_medicament, +1)}
                        >
                          +
                        </button>
                        <button
                          className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-700 text-slate-700 hover:text-white text-sm font-semibold transition-colors flex items-center justify-center"
                          onClick={() => adjustQuantity(c.nom_medicament, -1)}
                        >
                          −
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Buttons Section */}
          <div className="w-[380px] flex flex-col gap-3">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  label="Nom du patient"
                  size="small"
                  value={patientName}
                  onChange={handleChange}
                  fullWidth
                />
                <TextField label="Code / Barcode" size="small" fullWidth />
              </Stack>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleVente("Especes", "Aucun")}
                  ref={venteEspecesRef}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Vente Espèces (F3)
                </button>
                <button
                  onClick={() => setClientModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Vente Crédit
                </button>
                <button
                  onClick={() => handleVente("TPE", "Aucun")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Vente TPE
                </button>
                <button
                  onClick={() => setShowAvoirModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Traiter Avoir
                </button>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {totalarticle}
                  </span>{" "}
                  articles
                </span>
                <span className="text-xl font-semibold text-emerald-600 tabular-nums">
                  {total.toLocaleString()} MAD
                </span>
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
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
      <h2 className="text-base font-semibold mb-1 text-slate-900">
        Code d'accès
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        Entrez le code d'accès pour confirmer la vente
      </p>

      <input
        ref={codeInputRef}
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
        className="w-full px-4 py-3 mb-5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
        placeholder="••••••••"
      />

      <div className="flex justify-end gap-2">
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          onClick={() => {
            setShowCodeModal(false);
            setCodeInput("");
          }}
        >
          Annuler
        </button>
        <button
          id="validateButton"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
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
