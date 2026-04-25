import Header from "./header";
import { useEffect, useState, useMemo, useRef } from "react";
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

  // -------------------- State --------------------
  const [salesData, setSalesData] = useState<Vente[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const tableRef = useRef<HTMLDivElement>(null);

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

  // -------------------- Impression --------------------
  const handlePrint = () => {
    const printContent = tableRef.current?.innerHTML;
    const printWindow = window.open("", "_blank");
    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Caisse du jour</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; text-align: center; }
              th { background-color: #f0f0f0; }
              h2 { text-align: center; color: #2e7d32; }
              .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h2>Caisse du jour (${new Date().toLocaleDateString()})</h2>
            ${printContent}
            <div class="total">Total: ${totalSalesFiltered.toFixed(2)} MAD</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const inputCls =
    "px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all";
  const thCls =
    "text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50";
  const tdCls = "text-slate-700 text-sm";

  return (
    <div className="min-h-screen bg-slate-50">
      <Header titre="Historique des Ventes" />
      <div className="max-w-[1600px] mx-auto px-6 pt-5 pb-8 space-y-5">
        {/* -------------------- Filter Sales -------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700">
              Filtrer entre deux dates
            </label>
            <input
              type="date"
              className={inputCls}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              className={inputCls}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <button
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              Réinitialiser
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm">
              <span className="text-slate-500">Total · </span>
              <span className="font-semibold text-emerald-600 tabular-nums">
                {totalSalesFiltered.toFixed(2)} MAD
              </span>
            </div>
            <button
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
              onClick={handlePrint}
            >
              Imprimer Caisse du Jour
            </button>
          </div>
        </div>

        {/* -------------------- Table Sales -------------------- */}
        <div
          ref={tableRef}
          className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto"
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell className={thCls}>Date</TableHeadCell>
                <TableHeadCell className={thCls}>Désignation</TableHeadCell>
                <TableHeadCell className={thCls}>Articles</TableHeadCell>
                <TableHeadCell className={thCls}>Sous-Total</TableHeadCell>
                <TableHeadCell className={thCls}>Type</TableHeadCell>
                <TableHeadCell className={thCls}>Responsable</TableHeadCell>
                <TableHeadCell className={thCls}>Client</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                    Aucune vente trouvée pour la période sélectionnée.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.salesID} className="bg-white hover:bg-slate-50 transition-colors">
                    <TableCell className={tdCls}>{formatDate(sale.date)}</TableCell>
                    <TableCell className="text-slate-900 text-sm font-medium">
                      {sale.medicines}
                    </TableCell>
                    <TableCell className={`${tdCls} tabular-nums`}>{sale.totalArticles}</TableCell>
                    <TableCell className={`${tdCls} tabular-nums font-semibold`}>
                      {sale.totalPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className={tdCls}>{sale.typeDeVente}</TableCell>
                    <TableCell className={tdCls}>{sale.responsable_Vente}</TableCell>
                    <TableCell className={tdCls}>{sale.nomClient}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      </div>
    </div>
  );
}
