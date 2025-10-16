import { useEffect, useState } from "react";
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
  quantite: number;
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
  pushed?: boolean; // ✅ To track if it’s already sent to DB
};

export default function GestionCommands() {
  const [nDocument, setNDocument] = useState("");
  const [societe, setSociete] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [search, setSearch] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    axios
      .get("http://localhost:7194/api/Medicines")
      .then((res) => setMedicines(res.data))
      .catch((err) => console.error("Erreur chargement médicaments:", err));
  }, []);

  useEffect(() => {
    const savedDocs = localStorage.getItem("documents");
    if (savedDocs) setDocuments(JSON.parse(savedDocs));
  }, []);

  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents));
  }, [documents]);

  const results =
    search.trim().length > 0
      ? medicines.filter(
          (m) =>
            m.nom_medicament.toLowerCase().includes(search.toLowerCase()) ||
            m.code.toLowerCase().includes(search.toLowerCase())
        )
      : [];

  const addMedicine = (med: Medicine) => {
    if (items.find((i) => i.med.id === med.id)) return;
    setItems([
      ...items,
      { med, QTE_LIVR: 0, TOTAL_PPV: 0, PH: Number(med.ph) || 0, TOTAL_PH: 0 },
    ]);
    setSearch("");
  };

  const updateQuantity = (id: number, qty: number) => {
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
  };

  const updatePH = (id: number, ph: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.med.id === id ? { ...i, PH: ph, TOTAL_PH: i.QTE_LIVR * ph } : i
      )
    );
  };

  const totalPPV = items.reduce((sum, i) => sum + i.TOTAL_PPV, 0);
  const totalPH = items.reduce((sum, i) => sum + i.TOTAL_PH, 0);

  const addDocument = () => {
    if (!nDocument || !societe || !dateReceived || items.length === 0) return;

    const newDoc: Document = {
      nDocument,
      societe,
      dateReceived,
      items,
      pushed: false,
    };
    setDocuments([...documents, newDoc]);

    setNDocument("");
    setSociete("");
    setDateReceived("");
    setItems([]);
  };

  // ✅ Push one document to the database
  const pushToDatabase = async (doc: Document, index: number) => {
    try {
      await axios.post("http://localhost:7194/api/livraison", doc);
      const updated = [...documents];
      updated[index].pushed = true;
      setDocuments(updated);
      alert(`Document ${doc.nDocument} envoyé à la base de données ✅`);
    } catch (err) {
      console.error("Erreur envoi base:", err);
      alert("Erreur lors de l'envoi à la base de données ❌");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Header titre="Gestion Commandes" />
      <h1 className="text-2xl font-bold">Gestion Commandes - Livraison</h1>

      {/* Formulaire général */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block font-medium">N° Document</label>
          <input
            className="border rounded p-2 w-full"
            value={nDocument}
            onChange={(e) => setNDocument(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium">Société</label>
          <input
            className="border rounded p-2 w-full"
            value={societe}
            onChange={(e) => setSociete(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium">Date Réception</label>
          <input
            type="date"
            className="border rounded p-2 w-full"
            value={dateReceived}
            onChange={(e) => setDateReceived(e.target.value)}
          />
        </div>
      </div>

      {/* Recherche médicaments */}
      <div className="flex gap-2 items-center mt-4">
        <input
          className="border rounded p-2 flex-1"
          placeholder="Chercher médicament par nom ou code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Résultats filtrés */}
      {results.length > 0 && (
        <div className="border p-2 rounded bg-gray-50 mt-2">
          {results.slice(0, 5).map((med) => (
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

      {/* Tableau médicaments */}
      {items.length > 0 && (
        <table className="w-full border-collapse border mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Désignation</th>
              <th className="border p-2">Forme</th>
              <th className="border p-2">Présentation</th>
              <th className="border p-2">PU PPV</th>
              <th className="border p-2">PU PH</th>
              <th className="border p-2">Quantité Livrée</th>
              <th className="border p-2">Total PPV</th>
              <th className="border p-2">Total PH</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.med.id}>
                <td className="border p-2">{i.med.nom_medicament}</td>
                <td className="border p-2">{i.med.forme}</td>
                <td className="border p-2">{i.med.presentation}</td>
                <td className="border p-2">{i.med.ppv}</td>
                <td className="border p-2">
                  <input
                    type="number"
                    step="0.01"
                    className="border rounded p-1 w-20"
                    value={i.PH}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      updatePH(i.med.id, isNaN(value) ? 0 : value);
                    }}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    className="border rounded p-1 w-20"
                    value={i.QTE_LIVR}
                    onChange={(e) =>
                      updateQuantity(i.med.id, Number(e.target.value))
                    }
                  />
                </td>
                <td className="border p-2 font-semibold">
                  {i.TOTAL_PPV.toFixed(2)}
                </td>
                <td className="border p-2 font-semibold">
                  {i.TOTAL_PH.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={6} className="border p-2 text-right">
                Totaux
              </td>
              <td className="border p-2">{totalPPV.toFixed(2)}</td>
              <td className="border p-2">{totalPH.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}

      <Button onClick={addDocument} className="mt-4 bg-blue-600 text-white">
        Enregistrer Document
      </Button>

      {/* Documents sauvegardés */}
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
              <strong>Date Réception:</strong> {doc.dateReceived}
            </p>

            <p className="mt-2 font-semibold">Lignes:</p>
            <ul className="ml-4 list-disc">
              {doc.items.map((item) => (
                <li key={item.med.id}>
                  {item.med.nom_medicament} - QTE: {item.QTE_LIVR}, Total PPV:{" "}
                  {item.TOTAL_PPV.toFixed(2)}, Total PH:{" "}
                  {item.TOTAL_PH.toFixed(2)}
                </li>
              ))}
            </ul>

            {!doc.pushed && (
              <Button
                color="success"
                className="mt-3"
                onClick={() => pushToDatabase(doc, idx)}
              >
                📤 Envoyer à la base
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
