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
  // State
  const [data, setData] = useState<Vente[]>([]);
  const [filterDate, setFilterDate] = useState<string>("");

  // Type matching API
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

  // Fetch data
  useEffect(() => {
    axios
      .get("http://localhost:7194/api/sales")
      .then((response) => {
        // Trim spaces to avoid display issues
        const cleaned = response.data.map((sale: Vente) => ({
          ...sale,
          responsable_Vente: sale.responsable_Vente?.trim(),
        }));
        setData(cleaned);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  // Today's date
  const today = new Date().toISOString().split("T")[0];

  // Total of today's sales
  const totalToday = data
    .filter(
      (sale) =>
        sale.date && new Date(sale.date).toISOString().split("T")[0] === today
    )
    .reduce((acc, sale) => acc + (sale.totalPrice || 0), 0);

  // Filtered data based on selected date
  const filteredData = filterDate
    ? data.filter(
        (sale) =>
          sale.date &&
          new Date(sale.date).toISOString().split("T")[0] === filterDate
      )
    : data;

  // Format date nicely
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
    <div className="p-6 flex flex-col space-y-6">
      {/* Header */}
      <Header utilisateur="SABRI Rabab" titre="Gestion d'Inventaires" />

      {/* Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow">
        <div className="flex items-center space-x-4">
          <label className="font-medium">Filtrer par date :</label>
          <input
            type="date"
            className="border rounded-lg px-2 py-1"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded-lg"
            onClick={() => setFilterDate("")} // reset filter
          >
            Réinitialiser
          </button>
        </div>
        <div className="text-lg font-semibold">
          Total aujourd’hui : {totalToday.toFixed(2)} MAD
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-2xl shadow overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell className="text-blue-700 fw-bold">
                Date
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 fw-bold">
                Désignation
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 fw-bold">
                Total Article
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 fw-bold">
                Sous Total
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 fw-bold">
                Type de Vente
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 fw-bold">
                Responsable
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 fw-bold">
                Nom Client
              </TableHeadCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredData.map((sale) => (
              <TableRow key={sale.salesID}>
                <TableCell>{formatDate(sale.date)}</TableCell>
                <TableCell>{sale.medicines}</TableCell>
                <TableCell>{sale.totalArticles}</TableCell>
                <TableCell>{sale.totalPrice.toFixed(2)}</TableCell>
                <TableCell>{sale.typeDeVente}</TableCell>
                <TableCell>{sale.responsable_Vente}</TableCell>
                <TableCell>{sale.nomClient}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
