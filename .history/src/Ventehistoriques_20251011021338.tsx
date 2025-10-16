import { useEffect, useState } from "react";
import axios from "axios";
import Header from "./header";
import {
  Table,
  TableBody,
  TableHead,
  TableCell,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

type Medicine = {
  ID: number;
  CODE: string;
  Nom_medicament: string;
  DATE_PER: string; // MMYYYY
  PPV: number;
  PRESENTATION: string;
  FORME: string;
};

export default function HistoriqueMedicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [startDate, setStartDate] = useState<string>(""); // MMYYYY
  const [endDate, setEndDate] = useState<string>(""); // MMYYYY

  useEffect(() => {
    axios
      .get("http://localhost:7194/api/Medicines")
      .then((res) => setMedicines(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Convert MMYYYY → YYYYMM number
  const convertToNumber = (mmYYYY: string) => {
    if (!mmYYYY || mmYYYY.length !== 6) return 0;
    const month = mmYYYY.slice(0, 2);
    const year = mmYYYY.slice(2, 6);
    return parseInt(year + month); // YYYYMM
  };

  // Filtered medicines
  const filteredMedicines = medicines.filter((med) => {
    const medNum = convertToNumber(med.DATE_PER);
    const startNum = startDate ? convertToNumber(startDate) : 0;
    const endNum = endDate ? convertToNumber(endDate) : 999999;

    return medNum >= startNum && medNum <= endNum;
  });

  return (
    <div className="p-6 flex flex-col space-y-6">
      <Header utilisateur="SABRI Rabab" titre="Inventaire Médicaments" />

      {/* Date range filter */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-2xl shadow">
        <label className="font-medium">Période (MMYYYY) :</label>
        <input
          type="text"
          placeholder="Début MMYYYY"
          className="border rounded-lg px-2 py-1 w-24"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <span>—</span>
        <input
          type="text"
          placeholder="Fin MMYYYY"
          className="border rounded-lg px-2 py-1 w-24"
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

      {/* Table */}
      <div className="bg-white p-4 rounded-2xl shadow overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell className="text-blue-700 font-bold">
                Code
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Nom
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Date Péremption
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                PPV
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Présentation
              </TableHeadCell>
              <TableHeadCell className="text-blue-700 font-bold">
                Forme
              </TableHeadCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredMedicines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Aucun médicament trouvé pour cette période.
                </TableCell>
              </TableRow>
            ) : (
              filteredMedicines.map((med) => (
                <TableRow key={med.ID}>
                  <TableCell>{med.CODE}</TableCell>
                  <TableCell>{med.Nom_medicament}</TableCell>
                  <TableCell>{med.DATE_PER}</TableCell>
                  <TableCell>{med.PPV}</TableCell>
                  <TableCell>{med.PRESENTATION}</TableCell>
                  <TableCell>{med.FORME}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
