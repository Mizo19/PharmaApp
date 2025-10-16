import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import Header from "./header";
import { Button } from "flowbite-react";

type Medicine = {
  id: number;
  code: string;
  nom_medicament: string;
  forme: string;
  presentation: string;
  ppv: number;
  ph: number;
  quantite: number; // current stock
  datE_PER: string;
};

type LineItem = {
  med: Medicine;
  QTE_LIVR: number;
  TOTAL_PPV: number;
  PH: number;
  TOTAL_PH: number;
};

type Document = {
  nDocument: string;
  societe: string;
  dateReceived: string;
  items: LineItem[];
  pushed?: boolean;
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

  // Load documents from localStorage
  useEffect(() => {
    const savedDocs = localStorage.getItem("documents");
    if (savedDocs) setDocuments(JSON.parse(savedDocs));
  }, []);

  // Filter medicines for search
  const results = useMemo(() => {
    if (!search.trim()) return [];
    const searchLower = search.toLowerCase();
    return medicines
      .filter(
        (m) =>
          (m.nom_medicament?.toLowerCase() || "").includes(searchLower) ||
          (m.code?.toLowerCase() || "").includes(searchLower)
      )
      .slice(0, 5);
  }, [search, medicines]);

  // Totals
  const { totalPPV, totalPH } = useMemo(
    () => ({
      totalPPV: items.reduce((sum, i) => sum + i.TOTAL_PPV, 0),
      totalPH: items.reduce((sum, i) => sum + i.TOTAL_PH, 0),
    }),
    [items]
  );

  // Add medicine to items
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

  // Save document locally
  const addDocument = useCallback(() => {
    if (!nDocument || !societe || !dateReceived || items.length === 0) return;

    const newDoc: Document = {
      nDocument,
      societe,
      dateReceived: new Date(dateReceived).toISOString(),
      items,
    };

    setDocuments((prev) => {
      const updated = [...prev, newDoc];
      localStorage.setItem("documents", JSON.stringify(updated));
      return updated;
    });

    setNDocument("");
    setSociete("");
    setDateReceived("");
    setItems([]);
  }, [nDocument, societe, dateReceived, items]);

  // Push document to backend
  const pushToDatabase = useCallback(async (doc: Document, index: number) => {
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
          TOTAL_PPV: i.TOTAL_PPV,
          TOTAL_PPH: i.TOTAL_PH,
        })),
      };

      await axios.post("http://localhost:7194/api/livraison", payload);

      setDocuments((prev) => {
        const updated = [...prev];
        updated[index].pushed = true;
        localStorage.setItem("documents", JSON.stringify(updated));
        return updated;
      });

      alert(`Document ${doc.nDocument} envoyé à la base ✅`);
    } catch (err) {
      console.error("Erreur envoi base:", err);
      alert("Erreur lors de l'envoi à la base ❌");
    }
  }, []);

  // Remove document
  const removeDocument = useCallback((index: number) => {
    setDocuments((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      localStorage.setItem("documents", JSON.stringify(updated));
      return updated;
    });
  }, []);

  if (loading)
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        Chargement des médicaments...
      </div>
    );

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-emerald-50 to-emerald-100">
      <Header titre="Gestion Commandes" />
      <h1 className="text-2xl font-bold">Gestion Commandes - Livraison</h1>

      {/* Form */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label>N° Document</label>
          <input
            className="border p-2 w-full"
            value={nDocument}
            onChange={(e) => setNDocument(e.target.value)}
          />
        </div>
        <div>
          <label>Société</label>
          <input
            className="border p-2 w-full"
            value={societe}
            onChange={(e) => setSociete(e.target.value)}
          />
        </div>
        <div>
          <label>Date Réception</label>
          <input
            type="date"
            className="border p-2 w-full"
            value={dateReceived}
            onChange={(e) => setDateReceived(e.target.value)}
          />
        </div>
      </div>

      {/* Search */}
      <input
        className="border rounded p-2 mt-4 w-full"
        placeholder="Chercher médicament..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {results.length > 0 && (
        <div className="border p-2 rounded bg-gray-50 mt-2">
          {results.map((med) => (
            <div
              key={med.id}
              className="flex justify-between p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => addMedicine(med)}
            >
              <span>{med.nom_medicament}</span>
              <span className="text-sm text-gray-500">({med.code})</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <table className="w-full border-collapse border mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th>Désignation</th>
              <th>Forme</th>
              <th>Présentation</th>
              <th>PU PPV</th>
              <th>PU PH</th>
              <th>Quantité</th>
              <th>Total PPV</th>
              <th>Total PH</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.med.id}>
                <td>{i.med.nom_medicament}</td>
                <td>{i.med.forme}</td>
                <td>{i.med.presentation}</td>
                <td>{i.med.ppv}</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={i.PH}
                    onChange={(e) =>
                      updatePH(i.med.id, parseFloat(e.target.value) || 0)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={i.QTE_LIVR}
                    onChange={(e) =>
                      updateQuantity(i.med.id, Number(e.target.value))
                    }
                  />
                </td>
                <td>{i.TOTAL_PPV.toFixed(2)}</td>
                <td>{i.TOTAL_PH.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={6} className="text-right">
                Totaux
              </td>
              <td>{totalPPV.toFixed(2)}</td>
              <td>{totalPH.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}

      <Button onClick={addDocument} className="mt-4 bg-blue-600 text-white">
        Enregistrer Document
      </Button>

      {/* Saved Documents */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Documents enregistrés</h2>
        {documents.map((doc, idx) => (
          <div
            key={idx}
            className={`border rounded p-4 mb-2 ${
              doc.pushed ? "bg-green-50" : "bg-gray-50"
            }`}
          >
            <p>
              <strong>N° Document:</strong> {doc.nDocument}
            </p>
            <p>
              <strong>Société:</strong> {doc.societe}
            </p>
            <p>
              <strong>Date Réception:</strong>{" "}
              {new Date(doc.dateReceived).toLocaleDateString()}
            </p>
            <ul className="ml-4 list-disc mt-2">
              {doc.items.map((item) => (
                <li key={item.med.id}>
                  {item.med.nom_medicament} - QTE: {item.QTE_LIVR}, Total PPV:{" "}
                  {item.TOTAL_PPV.toFixed(2)}, Total PH:{" "}
                  {item.TOTAL_PH.toFixed(2)}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-3">
              {!doc.pushed && (
                <Button
                  color="success"
                  onClick={() => pushToDatabase(doc, idx)}
                >
                  📤 Envoyer à la base
                </Button>
              )}
              <Button color="failure" onClick={() => removeDocument(idx)}>
                🗑 Supprimer
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
