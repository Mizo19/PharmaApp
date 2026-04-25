import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Header from "./header";

type Medicine = {
  id: number;
  code: string;
  nom_medicament: string;
  forme: string;
  presentation: string;
  ppv: number;
  ph: number;
  quantite: number; // stock actuel
  datE_PER: string;
};

type LineItem = {
  med: Medicine;
  QTE_LIVR: number;
  TOTAL_PPV: number;
  PH: number;
  TOTAL_PH: number;
  DATE_PER: string; // new field
};

type DocType = "livraison" | "retour";

type Document = {
  nDocument: string;
  societe: string;
  dateReceived: string;
  items: LineItem[];
  pushed?: boolean;
  returned?: boolean;
  type?: DocType;
};

export default function GestionCommands() {
  const [nDocument, setNDocument] = useState("");
  const [societe, setSociete] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [search, setSearch] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const [displayCount, setDisplayCount] = useState(5);
  const [mode, setMode] = useState<DocType>("livraison");

  // Edition d'un document existant
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Filtres sur les documents enregistrés
  const [filterDoc, setFilterDoc] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Historique (documents déjà envoyés à la base)
  type ArchivedItem = {
    medId: number;
    medName: string;
    qteLivr: number;
    puPPV: number;
    puPPH: number;
    totalPPV: number;
    totalPPH: number;
  };
  type ArchivedDoc = {
    nDocument: string;
    societe: string;
    dateReceived: string;
    type: "livraison" | "retour";
    totalPPV: number;
    totalPPH: number;
    items: ArchivedItem[];
  };
  const [showArchive, setShowArchive] = useState(false);
  const [archivedDocs, setArchivedDocs] = useState<ArchivedDoc[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Formulaire "Nouveau produit" intégré à la commande
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProd, setNewProd] = useState({
    codeBarre: "",
    designation: "",
    datePeremption: "",
    ppv: "",
    ph: "",
    forme: "",
    presentation: "",
  });
  const [savingNewProd, setSavingNewProd] = useState(false);

  // Load medicines
  useEffect(() => {
    let isMounted = true;
    const loadMedicines = async () => {
      try {
        const res = await axios.get("http://localhost:7194/api/Medicines");
        if (isMounted) {
          setMedicines(res.data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Erreur chargement médicaments:", err);
        if (isMounted) setLoading(false);
      }
    };
    loadMedicines();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load saved documents
  useEffect(() => {
    const savedDocs = localStorage.getItem("documents");
    if (savedDocs) setDocuments(JSON.parse(savedDocs));
  }, []);

  // Filtered results
  const results = useMemo(() => {
    if (!search.trim()) return [];
    const searchLower = search.toLowerCase();
    return medicines
      .filter(
        (m) =>
          (m.nom_medicament?.toLowerCase() || "").includes(searchLower) ||
          (m.code?.toLowerCase() || "").includes(searchLower)
      )
      .slice(0, displayCount);
  }, [search, medicines, displayCount]);

  // Totals
  const { totalPPV, totalPH } = useMemo(
    () => ({
      totalPPV: items.reduce((sum, i) => sum + i.TOTAL_PPV, 0),
      totalPH: items.reduce((sum, i) => sum + i.TOTAL_PH, 0),
    }),
    [items]
  );

  // Add medicine
  const addMedicine = useCallback((med: Medicine) => {
    setItems((prev) => {
      if (prev.find((i) => i.med.id === med.id)) return prev;
      return [
        ...prev,
        {
          med,
          QTE_LIVR: 0,
          TOTAL_PPV: 0,
          PH: Number(med.ph) || 0,
          TOTAL_PH: 0,
          DATE_PER: med.datE_PER || "",
        },
      ];
    });
    setSearch("");
  }, []);

  // Update quantity
  const updateQuantity = useCallback((id: number, qty: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.med.id === id
          ? {
              ...i,
              QTE_LIVR: qty,
              TOTAL_PPV: qty * i.med.ppv,
              TOTAL_PH: qty * i.PH,
            }
          : i
      )
    );
  }, []);

  // Update PH
  const updatePH = useCallback((id: number, ph: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.med.id === id ? { ...i, PH: ph, TOTAL_PH: i.QTE_LIVR * ph } : i
      )
    );
  }, []);

  // Retirer un produit ajouté par erreur au panier (avant enregistrement)
  const removeItem = useCallback(async (id: number, name: string) => {
    const { isConfirmed } = await Swal.fire({
      title: "Retirer ce produit ?",
      html: `<strong>${name}</strong> sera retiré de la commande en cours.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, retirer",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    setItems((prev) => prev.filter((i) => i.med.id !== id));
  }, []);

  const resetForm = useCallback(() => {
    setNDocument("");
    setSociete("");
    setDateReceived("");
    setItems([]);
    setEditingIndex(null);
  }, []);

  // Charger un document dans le formulaire pour le modifier
  const editDocument = useCallback(
    (idx: number) => {
      const doc = documents[idx];
      if (!doc) return;
      setNDocument(doc.nDocument);
      setSociete(doc.societe);
      // ISO → yyyy-mm-dd pour input[type=date]
      const d = new Date(doc.dateReceived);
      const iso = isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
      setDateReceived(iso);
      setItems(doc.items);
      setMode(doc.type ?? "livraison");
      setEditingIndex(idx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [documents]
  );

  // Code de sécurité réutilisable pour les actions sensibles
  const requireCode = useCallback(async (action: string): Promise<boolean> => {
    const { value: code, isConfirmed } = await Swal.fire({
      title: "Code de sécurité",
      text: `Saisir le code pour ${action}`,
      input: "password",
      inputPlaceholder: "••••",
      inputAttributes: { autocapitalize: "off", autocomplete: "off" },
      showCancelButton: true,
      confirmButtonText: "Valider",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      confirmButtonColor: "#059669",
    });
    if (!isConfirmed) return false;
    if (code !== "1136") {
      Swal.fire({
        icon: "error",
        title: "Code incorrect",
        text: "Le code saisi est invalide.",
      });
      return false;
    }
    return true;
  }, []);

  // Add or update document locally
  const addDocument = useCallback(async () => {
    if (!nDocument || !societe || !dateReceived || items.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Champs incomplets",
        text: "Veuillez renseigner le N° document, la société, la date et au moins un article.",
      });
      return;
    }

    // Détection de doublon quand on n'est pas en édition
    if (editingIndex === null) {
      const existingIdx = documents.findIndex(
        (d) => d.nDocument.trim().toLowerCase() === nDocument.trim().toLowerCase()
      );
      if (existingIdx !== -1) {
        const { isConfirmed } = await Swal.fire({
          title: "Numéro déjà existant",
          html: `Un document portant le N° <strong>${nDocument}</strong> existe déjà.<br/>Voulez-vous le modifier à la place d'en créer un nouveau ?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Oui, modifier l'existant",
          cancelButtonText: "Annuler",
          reverseButtons: true,
          confirmButtonColor: "#059669",
        });
        if (!isConfirmed) return;
        editDocument(existingIdx);
        return;
      }
    }

    const newDoc: Document = {
      nDocument,
      societe,
      dateReceived: new Date(dateReceived).toISOString(),
      items,
      type: mode,
    };

    setDocuments((prev) => {
      let updated: Document[];
      if (editingIndex !== null) {
        updated = [...prev];
        // On conserve les flags pushed/returned s'ils existaient
        updated[editingIndex] = {
          ...newDoc,
          pushed: prev[editingIndex]?.pushed,
          returned: prev[editingIndex]?.returned,
        };
      } else {
        updated = [...prev, newDoc];
      }
      localStorage.setItem("documents", JSON.stringify(updated));
      return updated;
    });

    Swal.fire({
      icon: "success",
      title: editingIndex !== null ? "Document modifié" : "Document enregistré",
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });

    resetForm();
  }, [nDocument, societe, dateReceived, items, mode, editingIndex, documents, resetForm, editDocument]);

  // Créer un nouveau produit à la volée et l'ajouter à la commande
  const createAndAddProduct = useCallback(async () => {
    if (!newProd.codeBarre || !newProd.designation) {
      Swal.fire({
        icon: "warning",
        title: "Champs obligatoires",
        text: "Code-barres et désignation sont requis.",
      });
      return;
    }
    setSavingNewProd(true);
    try {
      // Formatage date MMYYYY si fourni en yyyy-mm-dd
      let datePer = newProd.datePeremption;
      if (datePer && datePer.includes("-")) {
        const [y, m] = datePer.split("-");
        datePer = `${m}${y}`;
      }

      const payload = {
        CODE: newProd.codeBarre,
        Nom_medicament: newProd.designation,
        DATE_PER: datePer,
        PPV: parseFloat(newProd.ppv) || 0,
        PH: newProd.ph || "",
        PRESENTATION: newProd.presentation,
        FORME: newProd.forme,
        Quantite: 0,
      };

      const res = await axios.post("http://localhost:7194/api/Medicines", payload);
      const created: Medicine = res.data?.id
        ? res.data
        : {
            id: Date.now(),
            code: newProd.codeBarre,
            nom_medicament: newProd.designation,
            forme: newProd.forme,
            presentation: newProd.presentation,
            ppv: parseFloat(newProd.ppv) || 0,
            ph: parseFloat(newProd.ph) || 0,
            quantite: 0,
            datE_PER: datePer,
          };

      setMedicines((prev) => [...prev, created]);
      setItems((prev) => [
        ...prev,
        {
          med: created,
          QTE_LIVR: 0,
          TOTAL_PPV: 0,
          PH: Number(created.ph) || 0,
          TOTAL_PH: 0,
          DATE_PER: created.datE_PER || datePer || "",
        },
      ]);
      setNewProd({
        codeBarre: "",
        designation: "",
        datePeremption: "",
        ppv: "",
        ph: "",
        forme: "",
        presentation: "",
      });
      setShowNewProduct(false);

      Swal.fire({
        icon: "success",
        title: "Produit ajouté",
        text: "Nouveau produit enregistré et ajouté à la commande.",
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (err) {
      console.error("Erreur création produit:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Impossible d'enregistrer le produit.",
      });
    } finally {
      setSavingNewProd(false);
    }
  }, [newProd]);

  // Push to backend
// Push to backend
const pushToDatabase = useCallback(async (doc: Document, index: number) => {
  if (!(await requireCode("envoyer ce document à la base"))) return;
  try {
    const payload = {
      N_DOCUMENT: doc.nDocument,
      NOM_SOCIETE: doc.societe,
      DATE_RECEIVED: doc.dateReceived,
      Items: doc.items.map((i) => ({
        MED_ID: i.med.id,
        MED_NAME: i.med.nom_medicament,
        QTE_LIVR: i.QTE_LIVR,
        PU_PPV: i.med.ppv,
        PU_PPH: i.PH,
        DATE_PER: i.DATE_PER, // <= ⚠️ C’est ici que la date semble vide
        TOTAL_PPV: i.TOTAL_PPV,
        TOTAL_PPH: i.TOTAL_PH,
      })),
    };

    // 🧩 LOG AVANT ENVOI
    console.log("=== LIVRAISON ENVOYÉE ===");
    console.log(JSON.stringify(payload, null, 2));

    // Endpoint selon le type : retour → /retour (décrémente), sinon /livraison (incrémente)
    const url =
      doc.type === "retour"
        ? "http://localhost:7194/api/livraison/retour"
        : "http://localhost:7194/api/livraison";

    const res = await axios.post(url, payload);
    console.log("✅ Réponse backend:", res.data);

    setDocuments((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      localStorage.setItem("documents", JSON.stringify(updated));
      return updated;
    });

    alert(
      doc.type === "retour"
        ? `Retour ${doc.nDocument} enregistré ✅`
        : `Document ${doc.nDocument} envoyé à la base ✅`
    );
  } catch (err) {
    console.error("❌ Erreur envoi base:", err);
    alert("Erreur lors de l'envoi à la base ❌");
  }
}, [requireCode]);

  // Return document — décrémente le stock
  // Si déjà envoyé → appelle l'endpoint inverse
  // Sinon → envoie directement comme retour (POST /retour)
  const returnDocument = useCallback(async (doc: Document, index: number) => {
    const { isConfirmed } = await Swal.fire({
      title: "Confirmer le retour",
      html: `Document <strong>${doc.nDocument}</strong><br/>Le stock sera <strong>décrémenté</strong> pour chaque médicament.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, retourner",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      confirmButtonColor: "#d97706",
    });

    if (!isConfirmed) return;
    if (!(await requireCode("retourner ce document"))) return;

    try {
      if (doc.pushed) {
        await axios.delete(
          `http://localhost:7194/api/livraison/inverse/${encodeURIComponent(doc.nDocument)}`
        );
      } else {
        const payload = {
          N_DOCUMENT: doc.nDocument,
          NOM_SOCIETE: doc.societe,
          DATE_RECEIVED: doc.dateReceived,
          Items: doc.items.map((i) => ({
            MED_ID: i.med.id,
            MED_NAME: i.med.nom_medicament,
            QTE_LIVR: i.QTE_LIVR,
            PU_PPV: i.med.ppv,
            PU_PPH: i.PH,
            DATE_PER: i.DATE_PER,
            TOTAL_PPV: i.TOTAL_PPV,
            TOTAL_PPH: i.TOTAL_PH,
          })),
        };
        await axios.post("http://localhost:7194/api/livraison/retour", payload);
      }

      setDocuments((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        localStorage.setItem("documents", JSON.stringify(updated));
        return updated;
      });

      Swal.fire({
        icon: "success",
        title: "Retour enregistré",
        text: "Le stock a été mis à jour.",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (err) {
      console.error("Erreur retour:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Impossible d'envoyer le retour à la base.",
      });
    }
  }, [requireCode]);

  // Fetch archived documents (déjà envoyés à la base)
  const fetchArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterDoc.trim()) params.q = filterDoc.trim();
      if (filterDateFrom) params.from = filterDateFrom;
      if (filterDateTo) params.to = filterDateTo;
      const res = await axios.get<ArchivedDoc[]>(
        "http://localhost:7194/api/livraison",
        { params }
      );
      setArchivedDocs(res.data);
    } catch (err) {
      console.error("Erreur chargement historique:", err);
      setArchivedDocs([]);
    } finally {
      setArchiveLoading(false);
    }
  }, [filterDoc, filterDateFrom, filterDateTo]);

  // Re-fetch archive whenever filters change while history is open
  useEffect(() => {
    if (!showArchive) return;
    const t = setTimeout(fetchArchive, 300);
    return () => clearTimeout(t);
  }, [showArchive, fetchArchive]);

  // Remove document
  const removeDocument = useCallback(async (index: number) => {
    if (!(await requireCode("supprimer ce document"))) return;
    setDocuments((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      localStorage.setItem("documents", JSON.stringify(updated));
      return updated;
    });
  }, [requireCode]);

  // Supprimer un document archivé (DB) — réverse le stock
  const deleteArchivedDoc = useCallback(async (doc: ArchivedDoc) => {
    const { isConfirmed } = await Swal.fire({
      title: "Supprimer ce document archivé ?",
      html: `Document <strong>${doc.nDocument}</strong><br/>Il sera retiré de l'historique et le stock sera ajusté.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    if (!(await requireCode("supprimer ce document de l'historique"))) return;

    try {
      await axios.delete(
        `http://localhost:7194/api/livraison/inverse/${encodeURIComponent(doc.nDocument)}`
      );
      setArchivedDocs((prev) => prev.filter((d) => d.nDocument !== doc.nDocument));
      Swal.fire({
        icon: "success",
        title: "Document supprimé",
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (err) {
      console.error("Erreur suppression archive:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Impossible de supprimer le document de l'historique.",
      });
    }
  }, [requireCode]);

  // Modifier un document archivé : on le retire de l'archive (réverse stock)
  // et on le réinjecte dans "Documents enregistrés" pour édition + ré-envoi
  const editArchivedDoc = useCallback(async (doc: ArchivedDoc) => {
    const { isConfirmed } = await Swal.fire({
      title: "Modifier ce document archivé ?",
      html: `Document <strong>${doc.nDocument}</strong><br/>Il sera retiré de l'historique et chargé dans la liste des documents pour modification.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, modifier",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      confirmButtonColor: "#059669",
    });
    if (!isConfirmed) return;
    if (!(await requireCode("modifier ce document de l'historique"))) return;

    try {
      await axios.delete(
        `http://localhost:7194/api/livraison/inverse/${encodeURIComponent(doc.nDocument)}`
      );

      const localDoc: Document = {
        nDocument: doc.nDocument,
        societe: doc.societe,
        dateReceived: doc.dateReceived,
        type: doc.type,
        items: doc.items.map((it) => {
          const med = medicines.find((m) => m.id === it.medId) ?? {
            id: it.medId,
            code: "",
            nom_medicament: it.medName,
            forme: "",
            presentation: "",
            ppv: it.puPPV,
            ph: it.puPPH,
            quantite: 0,
            datE_PER: "",
          };
          return {
            med,
            QTE_LIVR: it.qteLivr,
            PH: it.puPPH,
            TOTAL_PPV: it.totalPPV,
            TOTAL_PH: it.totalPPH,
            DATE_PER: "",
          };
        }),
      };

      setDocuments((prev) => {
        const updated = [...prev, localDoc];
        localStorage.setItem("documents", JSON.stringify(updated));
        return updated;
      });
      setArchivedDocs((prev) => prev.filter((d) => d.nDocument !== doc.nDocument));

      Swal.fire({
        icon: "success",
        title: "Document chargé",
        text: "Modifiez-le dans 'Documents enregistrés' puis renvoyez-le à la base.",
        timer: 2800,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (err) {
      console.error("Erreur modification archive:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Impossible de modifier le document de l'historique.",
      });
    }
  }, [requireCode, medicines]);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50">
        <Header titre="Gestion Commandes" />
        <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
          Chargement des médicaments...
        </div>
      </div>
    );

  // Documents filtrés (par N° et par plage de dates)
  const filteredDocuments = documents
    .map((doc, idx) => ({ doc, idx }))
    .filter(({ doc }) => {
      if (
        filterDoc.trim() &&
        !doc.nDocument.toLowerCase().includes(filterDoc.trim().toLowerCase())
      )
        return false;
      if (filterDateFrom) {
        const from = new Date(filterDateFrom).getTime();
        if (new Date(doc.dateReceived).getTime() < from) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (new Date(doc.dateReceived).getTime() > to) return false;
      }
      return true;
    });

  const inputCls =
    "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all";
  const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block";

  return (
    <div className="min-h-screen bg-slate-50">
      <Header titre="Gestion Commandes" />
      <div className="max-w-[1600px] mx-auto px-6 pt-5 pb-8 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Commandes · {mode === "retour" ? "Retour" : "Livraison"}
          </h1>

          {/* Toggle Livraison / Retour */}
          <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg">
            <button
              onClick={() => setMode("livraison")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                mode === "livraison"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Livraison
            </button>
            <button
              onClick={() => setMode("retour")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                mode === "retour"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Retour
            </button>
          </div>
        </div>

        {/* Formulaire document */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>N° Document</label>
              <input
                className={inputCls}
                value={nDocument}
                onChange={(e) => setNDocument(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Société</label>
              <input
                className={inputCls}
                value={societe}
                onChange={(e) => setSociete(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Date Réception</label>
              <input
                type="date"
                className={inputCls}
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
              />
            </div>
          </div>

          {/* Bouton rubrique Nouveau Produit */}
          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <span className={labelCls + " !mb-0"}>Ajouter au panier</span>
            <button
              type="button"
              onClick={() => setShowNewProduct((v) => !v)}
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md px-3 py-1.5 transition-colors"
            >
              {showNewProduct ? "− Fermer Nouveau Produit" : "+ Nouveau Produit"}
            </button>
          </div>

          {/* Rubrique Nouveau Produit */}
          {showNewProduct && (
            <div className="mt-3 border border-emerald-200 bg-emerald-50/40 rounded-lg p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-3">
                Créer un nouveau produit et l'ajouter à la commande
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Code-barres *</label>
                  <input
                    className={inputCls}
                    value={newProd.codeBarre}
                    onChange={(e) => setNewProd((p) => ({ ...p, codeBarre: e.target.value }))}
                    placeholder="Ex: 6111234567890"
                  />
                </div>
                <div>
                  <label className={labelCls}>Désignation *</label>
                  <input
                    className={inputCls}
                    value={newProd.designation}
                    onChange={(e) => setNewProd((p) => ({ ...p, designation: e.target.value }))}
                    placeholder="Nom du médicament"
                  />
                </div>
                <div>
                  <label className={labelCls}>Date Péremption</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={newProd.datePeremption}
                    onChange={(e) => setNewProd((p) => ({ ...p, datePeremption: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>PPV</label>
                  <input
                    type="number"
                    step="0.01"
                    className={inputCls}
                    value={newProd.ppv}
                    onChange={(e) => setNewProd((p) => ({ ...p, ppv: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={labelCls}>PH</label>
                  <input
                    type="number"
                    step="0.01"
                    className={inputCls}
                    value={newProd.ph}
                    onChange={(e) => setNewProd((p) => ({ ...p, ph: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={labelCls}>Forme</label>
                  <input
                    className={inputCls}
                    value={newProd.forme}
                    onChange={(e) => setNewProd((p) => ({ ...p, forme: e.target.value }))}
                    placeholder="Comprimé, sirop..."
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={labelCls}>Présentation</label>
                  <input
                    className={inputCls}
                    value={newProd.presentation}
                    onChange={(e) => setNewProd((p) => ({ ...p, presentation: e.target.value }))}
                    placeholder="Boîte de 20..."
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={savingNewProd}
                  onClick={createAndAddProduct}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-md transition-colors"
                >
                  {savingNewProd ? "Enregistrement..." : "Créer et ajouter"}
                </button>
              </div>
            </div>
          )}

          {/* Recherche médicaments */}
          <div className="mt-4">
            <label className={labelCls}>Rechercher un médicament</label>
            <input
              className={inputCls}
              placeholder="Nom ou code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {results.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
                {results.map((med) => (
                  <div
                    key={med.id}
                    className="flex justify-between items-center px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                    onClick={() => addMedicine(med)}
                  >
                    <span className="text-slate-800">
                      {med.nom_medicament}{" "}
                      <span className="text-slate-400">{med.presentation}</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {med.code}
                    </span>
                  </div>
                ))}
                {displayCount < medicines.length && (
                  <button
                    onClick={() => setDisplayCount((prev) => prev + 5)}
                    className="w-full py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    Voir plus...
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tableau des items */}
        {items.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {[
                      "Désignation",
                      "Forme",
                      "Présentation",
                      "PU PPV",
                      "PU PH",
                      "Quantité",
                      "Péremption",
                      "Total PPV",
                      "Total PH",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 ${
                          h === "Action" ? "text-center" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((i) => (
                    <tr key={i.med.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-900 font-medium">
                        {i.med.nom_medicament}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{i.med.forme}</td>
                      <td className="px-4 py-2.5 text-slate-600">{i.med.presentation}</td>
                      <td className="px-4 py-2.5 text-slate-700 tabular-nums">{i.med.ppv}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={i.PH}
                          onChange={(e) =>
                            updatePH(i.med.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-md text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          value={i.QTE_LIVR}
                          onChange={(e) =>
                            updateQuantity(i.med.id, Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-md text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={i.DATE_PER}
                          placeholder="MMYYYY"
                          maxLength={6}
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((item) =>
                                item.med.id === i.med.id
                                  ? { ...item, DATE_PER: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-2.5 text-slate-900 font-semibold tabular-nums">
                        {i.TOTAL_PPV.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-900 font-semibold tabular-nums">
                        {i.TOTAL_PH.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(i.med.id, i.med.nom_medicament)}
                          title="Retirer ce produit de la commande"
                          aria-label="Retirer ce produit"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
                    <td colSpan={7} className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500">
                      Totaux
                    </td>
                    <td className="px-4 py-3 text-slate-900 tabular-nums">
                      {totalPPV.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-900 tabular-nums">
                      {totalPH.toFixed(2)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 text-right">
              {items.length} produit{items.length > 1 ? "s" : ""} dans la commande
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={addDocument}
            className={`text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors ${
              mode === "retour"
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {editingIndex !== null
              ? "Mettre à jour"
              : mode === "retour"
              ? "Enregistrer Retour"
              : "Enregistrer Document"}
          </button>
          {editingIndex !== null && (
            <button
              onClick={resetForm}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Annuler l'édition
            </button>
          )}
          {editingIndex !== null && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
              Modification du document #{editingIndex + 1}
            </span>
          )}
        </div>

        {/* Documents enregistrés */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full" />
              Documents enregistrés
              <span className="text-xs font-normal text-slate-500">
                ({filteredDocuments.length}/{documents.length})
              </span>
            </h2>
          </div>

          {/* Filtres : recherche par N° ou par date */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Rechercher un document — par N° ou par date
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className={labelCls}>Par N° document</label>
                <input
                  className={inputCls}
                  value={filterDoc}
                  onChange={(e) => setFilterDoc(e.target.value)}
                  placeholder="Ex: DOC-00123"
                />
              </div>
              <div>
                <label className={labelCls}>Par date (du)</label>
                <input
                  type="date"
                  className={inputCls}
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Par date (au)</label>
                <input
                  type="date"
                  className={inputCls}
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>
            {(filterDoc || filterDateFrom || filterDateTo) && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    setFilterDoc("");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filteredDocuments.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                Aucun document ne correspond aux filtres.
              </div>
            )}
            {filteredDocuments.map(({ doc, idx }) => {
              const isRetour = doc.type === "retour";
              return (
              <div
                key={idx}
                className={`border rounded-xl p-5 shadow-sm transition-colors ${
                  doc.returned
                    ? "bg-rose-50/50 border-rose-200"
                    : isRetour
                    ? "bg-amber-50/40 border-amber-200"
                    : doc.pushed
                    ? "bg-emerald-50/50 border-emerald-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                          isRetour
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {isRetour ? "Retour" : "Livraison"}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        N°
                      </span>
                      <span className="text-sm font-mono font-medium text-slate-900">
                        {doc.nDocument}
                      </span>
                      {doc.returned ? (
                        <span className="ml-1 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-rose-100 text-rose-700 rounded-full">
                          Annulé
                        </span>
                      ) : doc.pushed ? (
                        <span
                          className={`ml-1 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                            isRetour
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          Envoyé
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="text-slate-400">Société · </span>
                      <span className="text-slate-800 font-medium">{doc.societe}</span>
                      <span className="text-slate-400 ml-3">Reçu · </span>
                      <span className="text-slate-800">
                        {new Date(doc.dateReceived).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    {!doc.pushed && !doc.returned && (
                      <button
                        onClick={() => pushToDatabase(doc, idx)}
                        className={`px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors ${
                          isRetour
                            ? "bg-amber-500 hover:bg-amber-600"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {isRetour ? "Envoyer Retour" : "Envoyer à la base"}
                      </button>
                    )}
                    {!doc.returned && (
                      <button
                        onClick={() => editDocument(idx)}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                      >
                        Modifier
                      </button>
                    )}
                    {!doc.returned && !isRetour && (
                      <button
                        onClick={() => returnDocument(doc, idx)}
                        className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
                      >
                        Retour
                      </button>
                    )}
                    <button
                      onClick={() => removeDocument(idx)}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
                <ul className="text-sm text-slate-600 space-y-1 pl-1">
                  {doc.items.map((item) => (
                    <li key={item.med.id} className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-slate-800 font-medium">
                        {item.med.nom_medicament}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="tabular-nums">Qté {item.QTE_LIVR}</span>
                      <span className="text-slate-400">·</span>
                      <span className="tabular-nums">PPV {item.TOTAL_PPV.toFixed(2)}</span>
                      <span className="text-slate-400">·</span>
                      <span className="tabular-nums">PH {item.TOTAL_PH.toFixed(2)}</span>
                      {item.DATE_PER && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="tabular-nums text-slate-500">{item.DATE_PER}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              );
            })}
          </div>
        </div>

        {/* Historique (documents archivés en base) */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-1 h-4 bg-sky-500 rounded-full" />
              Historique (archivés)
              {showArchive && (
                <span className="text-xs font-normal text-slate-500">
                  ({archivedDocs.length})
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => setShowArchive((v) => !v)}
              className="text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md px-3 py-1.5 transition-colors"
            >
              {showArchive ? "Masquer l'historique" : "Afficher l'historique"}
            </button>
          </div>

          {showArchive && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Les filtres ci-dessus (N° et dates) s'appliquent aussi à l'historique.
              </p>

              {archiveLoading && (
                <div className="text-center py-6 text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                  Chargement...
                </div>
              )}

              {!archiveLoading && archivedDocs.length === 0 && (
                <div className="text-center py-10 text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                  Aucun document archivé ne correspond aux filtres.
                </div>
              )}

              {!archiveLoading &&
                archivedDocs.map((doc) => {
                  const isRetour = doc.type === "retour";
                  return (
                    <div
                      key={doc.nDocument + doc.dateReceived}
                      className={`border rounded-xl p-5 shadow-sm ${
                        isRetour
                          ? "bg-amber-50/40 border-amber-200"
                          : "bg-sky-50/30 border-sky-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                                isRetour
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-sky-100 text-sky-700"
                              }`}
                            >
                              {isRetour ? "Retour" : "Livraison"}
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              N°
                            </span>
                            <span className="text-sm font-mono font-medium text-slate-900">
                              {doc.nDocument}
                            </span>
                            <span className="ml-1 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-full">
                              Archivé
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">
                            <span className="text-slate-400">Société · </span>
                            <span className="text-slate-800 font-medium">{doc.societe}</span>
                            <span className="text-slate-400 ml-3">Reçu · </span>
                            <span className="text-slate-800">
                              {new Date(doc.dateReceived).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right text-xs text-slate-500">
                            <div>
                              PPV <span className="font-semibold text-slate-800 tabular-nums">{doc.totalPPV.toFixed(2)}</span>
                            </div>
                            <div>
                              PH <span className="font-semibold text-slate-800 tabular-nums">{doc.totalPPH.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => editArchivedDoc(doc)}
                              className="px-3 py-1.5 text-xs font-medium bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => deleteArchivedDoc(doc)}
                              className="px-3 py-1.5 text-xs font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                      <ul className="text-sm text-slate-600 space-y-1 pl-1">
                        {doc.items.map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-slate-800 font-medium">{item.medName}</span>
                            <span className="text-slate-400">·</span>
                            <span className="tabular-nums">Qté {item.qteLivr}</span>
                            <span className="text-slate-400">·</span>
                            <span className="tabular-nums">PPV {item.totalPPV.toFixed(2)}</span>
                            <span className="text-slate-400">·</span>
                            <span className="tabular-nums">PH {item.totalPPH.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
