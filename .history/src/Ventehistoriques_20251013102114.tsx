import Header from "./header";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableHead,
  TableCell,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

export default function HistoriqueVentes() {
  // Types
  type Vente = {
    salesID: number;
    date: string;
    medicines: string;
    totalArticles: number;
    totalPrice: number;
    typeDeVente: string;
    numeroDeVente: number;
    nomClient: string;
    responsable_Vente: string;
    quantiteRestante: number;
  };

  // State
  const [data, setData] = useState<Vente[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch data
  useEffect(() => {
    axios
      .get("http://localhost:7194/api/sales")
      .then((response) => {
        const cleaned = response.data.map((sale: Vente) => ({
          ...sale,
          responsable_Vente: sale.responsable_Vente?.trim(),
        }));
        setData(cleaned);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  // Today's date (default)
  const today = new Date().toISOString().split("T")[0];

  // Filtered data logic
  const filteredData = data.filter((sale) => {
    if (!sale.date) return false;
    const saleDate = new Date(sale.date).toISOString().split("T")[0];

    // Default: show today's sales
    if (!startDate && !endDate) return saleDate === today;

    // If both start and end dates are set, show within range
    if (startDate && endDate) {
      return saleDate >= startDate && saleDate <= endDate;
    }

    // If only start date set
    if (startDate && !endDate) return saleDate >= startDate;

    // If only end date set
    if (!startDate && endDate) return saleDate <= endDate;

    return false;
  });

  // Total of filtered sales
  const totalFiltered = filteredData.reduce(
    (acc, sale) => acc + (sale.totalPrice || 0),
    0
  );

  // Date formatter
  const formatDate = (isoDate: string) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()} ${d
      .getHours()
      .toString()
      .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-6 flex flex-col space-y-6 bg-gradient-to-br from-emerald-50 to-emerald-100">
      {/* Header */}
      <Header titre="Gestion d'Inventaires" />

      {/* Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow">
        <div className="flex items-center space-x-4">
          <label className="font-medium">Filtrer entre deux dates :</label>

          <input
            type="date"
            className="border rounded-lg px-2 py-1"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>—</span>
          <input
            type="date"
            className="border rounded-lg px-2 py-1"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded-lg"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Réinitialiser
          </button>
        </div>

        <div className="text-lg font-semibold">
          Total : {totalFiltered.toFixed(2)} MAD
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-2xl shadow overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell className="text-blue-700 font-bold">
                Date
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Désignation
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Total Articles
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Sous Total
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Type de Vente
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Responsable
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Nom Client
              </TableHeadCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Aucune vente trouvée pour la date sélectionnée.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((sale) => (
                <TableRow key={sale.salesID}>
                  <TableCell>{formatDate(sale.date)}</TableCell>
                  <TableCell>{sale.medicines}</TableCell>
                  <TableCell>{sale.totalArticles}</TableCell>
                  <TableCell>{sale.totalPrice.toFixed(2)}</TableCell>
                  <TableCell>{sale.typeDeVente}</TableCell>
                  <TableCell>{sale.responsable_Vente}</TableCell>
                  <TableCell>{sale.nomClient}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
