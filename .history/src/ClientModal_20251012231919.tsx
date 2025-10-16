import { useEffect, useState } from "react";

type Client = {
  id: number;
  clientName: string;
};

type ClientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (clientName: string) => void;
};

export default function ClientModal({
  isOpen,
  onClose,
  onSelectClient,
}: ClientModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualClient, setManualClient] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch("http://localhost:7194/api/credits")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch((err) => console.error("Erreur API clients:", err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (manualClient.trim() !== "") {
      onSelectClient(manualClient.trim());
    }
    onClose();
    setManualClient("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50bg-gradient-to-br from-emerald-50 to-emerald-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-bold mb-4">Sélection du client</h2>

        {loading ? (
          <p>Chargement des clients...</p>
        ) : (
          <ul className="max-h-40 overflow-auto mb-4">
            {clients.map((c) => (
              <li
                key={c.id}
                className="cursor-pointer hover:bg-gray-200 px-2 py-1 rounded"
                onClick={() => {
                  onSelectClient(c.clientName);
                  onClose();
                }}
              >
                {c.clientName}
              </li>
            ))}
          </ul>
        )}

        <input
          type="text"
          placeholder="Nom du client (manuel)"
          value={manualClient}
          onChange={(e) => setManualClient(e.target.value)}
          className="border p-2 w-full mb-4 rounded"
        />

        <div className="flex justify-end space-x-2">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleConfirm}
          >
            Confirmer
          </button>
          <button
            className="bg-gray-300 px-4 py-2 rounded"
            onClick={() => {
              onClose();
              setManualClient("");
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
