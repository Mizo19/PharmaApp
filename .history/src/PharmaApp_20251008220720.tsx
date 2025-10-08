import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

interface Sale {
  salesId: number;
  date: string;
  medicines: string;
  totalArticles: number;
  totalPrice: number;
  typeDeVente: string;
  numeroDeVente: number;
  nomClient: string;
  responsable_Vente: string;
  quantiteRestante: number;
}

interface Credit {
  clientName: string;
  montantTotal: number;
  ventes: Sale[];
}

const GestionCredit: React.FC = () => {
  const [credits, setCredits] = useState<Credit[]>([]);

  const fetchCreditsFromSales = async () => {
    try {
      const res = await axios.get<Sale[]>("http://localhost:7194/api/sales");

      // 🔹 filter ventes with typeDeVente = "Crédit"
      const creditSales = res.data.filter((v) => v.typeDeVente === "Crédit");

      // 🔹 group by clientName
      const grouped: Record<string, Credit> = {};
      for (const sale of creditSales) {
        if (!grouped[sale.nomClient]) {
          grouped[sale.nomClient] = {
            clientName: sale.nomClient,
            montantTotal: 0,
            ventes: [],
          };
        }
        grouped[sale.nomClient].montantTotal += sale.totalPrice;
        grouped[sale.nomClient].ventes.push(sale);
      }

      setCredits(Object.values(grouped));
    } catch (err) {
      console.error("Erreur fetch ventes crédits:", err);
    }
  };

  useEffect(() => {
    fetchCreditsFromSales();
  }, []);

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        Crédits Clients (à partir des ventes)
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#1976d2" }}>
            <TableRow>
              <TableCell sx={{ color: "white" }}>Client</TableCell>
              <TableCell sx={{ color: "white" }}>
                Montant Total Crédit
              </TableCell>
              <TableCell sx={{ color: "white" }}>Détails</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {credits.map((c) => (
              <TableRow key={c.clientName}>
                <TableCell>{c.clientName}</TableCell>
                <TableCell>{c.montantTotal.toFixed(2)} MAD</TableCell>
                <TableCell>
                  {c.ventes.map((v) => (
                    <div key={v.salesId}>
                      {v.date.slice(0, 10)} – {v.medicines} :{" "}
                      {v.totalPrice.toFixed(2)} MAD
                    </div>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default GestionCredit;
