import Header from "./header";
import { useEffect, useState, useMemo } from "react";
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
  // -------------------- Types --------------------
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

  type Medicine = {
    id: number;
    code: string;
    nom_medicament: string;
    quantite: number;
    datE_PER: string; // MMYYYY
    categorie: string;
  };

  // -------------------- State --------------------
  const [salesData, setSalesData] = useState<Vente[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // -------------------- Fetch Sales --------------------
  useEffect(() => {
    axios
      .get("http://localhost:7194/api/sales")
      .then((res) => {
        const cleaned = res.data.map((sale: Vente) => ({
          ...sale,
          responsable_Vente: sale.responsable_Vente?.trim(),
        }));
        setSalesData(cleaned);
      })
      .catch((err) => console.error("Sales fetch error:", err));
  }, []);

  // -------------------- Fetch Medicines --------------------
  useEffect(() => {
    axios
      .get("http://localhost:7194/api/medicines")
      .then((res) => setMedicines(res.data))
      .catch((err) => console.error("Medicines fetch error:", err));
  }, []);

  // -------------------- Filter Sales --------------------
  const today = new Date().toISOString().split("T")[0];

  const filteredSales = useMemo(() => {
    return salesData.filter((sale) => {
      if (!sale.date) return false;
      const saleDate = new Date(sale.date).toISOString().split("T")[0];

      if (!startDate && !endDate) return saleDate === today;
      if (startDate && endDate)
        return saleDate >= startDate && saleDate <= endDate;
      if (startDate && !endDate) return saleDate >= startDate;
      if (!startDate && endDate) return saleDate <= endDate;
      return false;
    });
  }, [salesData, startDate, endDate]);

  const totalSalesFiltered = filteredSales.reduce(
    (acc, sale) => acc + (sale.totalPrice || 0),
    0
  );

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

  // -------------------- Medicines proches péremption --------------------
  const prochePeremption = useMemo(() => {
    const result: Medicine[] = [];
    const now = new Date();

    medicines.forEach((med) => {
      if (!med.datE_PER) return;
      const month = Number(med.datE_PER.slice(0, 2)) - 1; // JS months 0-11
      const year = Number(med.datE_PER.slice(2, 6));
      const expiryDate = new Date(year, month + 1, 0); // dernier jour du mois
      const diffMonths =
        (expiryDate.getFullYear() - now.getFullYear()) * 12 +
        (expiryDate.getMonth() - now.getMonth());

      // filtrer < 3 mois restant et quantité > 0
      if (diffMonths <= 3 && med.quantite && med.quantite > 0) {
        result.push(med);
      }
    });
    return result.sort((a, b) => {
      const aDate = new Date(
        Number(a.datE_PER.slice(2, 6)),
        Number(a.datE_PER.slice(0, 2)) - 1
      );
      const bDate = new Date(
        Number(b.datE_PER.slice(2, 6)),
        Number(b.datE_PER.slice(0, 2)) - 1
      );
      return aDate.getTime() - bDate.getTime();
    });
  }, [medicines]);

  return (
    <div className="p-6 flex flex-col space-y-6 bg-gradient-to-br from-emerald-50 to-emerald-100">
      <Header titre="Gestion d'Inventaires" />

      {/* -------------------- Filter Sales -------------------- */}
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
          Total : {totalSalesFiltered.toFixed(2)} MAD
        </div>
      </div>

      {/* -------------------- Table Sales -------------------- */}
      <div className="bg-white p-4 rounded-2xl shadow overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Date</TableHeadCell>
              <TableHeadCell>Désignation</TableHeadCell>
              <TableHeadCell>Total Articles</TableHeadCell>
              <TableHeadCell>Sous Total</TableHeadCell>
              <TableHeadCell>Type de Vente</TableHeadCell>
              <TableHeadCell>Responsable</TableHeadCell>
              <TableHeadCell>Nom Client</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Aucune vente trouvée pour la date sélectionnée.
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
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

      {/* -------------------- Table Proche Péremption -------------------- */}
      <div className="bg-white p-4 rounded-2xl shadow overflow-x-auto">
        <h2 className="text-lg font-bold mb-4 text-red-600">
          Médicaments Proches de Péremption (≤ 3 mois)
        </h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Nom Médicament</TableHeadCell>
              <TableHeadCell>Code</TableHeadCell>
              <TableHeadCell>Quantité</TableHeadCell>
              <TableHeadCell>Date Péremption</TableHeadCell>
              <TableHeadCell>Catégorie</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prochePeremption.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Aucun médicament proche de péremption.
                </TableCell>
              </TableRow>
            ) : (
              prochePeremption.map((med) => (
                <TableRow key={med.id}>
                  <TableCell>{med.nom_medicament}</TableCell>
                  <TableCell>{med.code}</TableCell>
                  <TableCell>{med.quantite}</TableCell>
                  <TableCell>{med.datE_PER}</TableCell>
                  <TableCell>{med.categorie}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
