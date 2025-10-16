import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
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
  salesID: number;
  date: string;
  medicines: string;
  totalArticles: number;
  totalPrice: number;
  typeDeVente: string;
  nomClient: string;
}

interface Credit {
  id: number;
  clientName: string;
  montantTotal: number;
  montantRestant: number;
  dateCreation: string;
  estPaye: boolean;
}

const FicheClient: React.FC = () => {
  const [clients, setClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);

  // Charger ventes
  const fetchSales = async () => {
    try {
      const res = await axios.get<Sale[]>("http://localhost:7194/api/sales");
      setSales(res.data);
      const clientsUnique = Array.from(
        new Set(res.data.map((s) => s.nomClient))
      );
      setClients(clientsUnique);
    } catch (err) {
      console.error("Erreur fetch ventes:", err);
    }
  };

  // Charger crédits
  const fetchCredits = async () => {
    try {
      const res = await axios.get<Credit[]>(
        "http://localhost:7194/api/credits"
      );
      setCredits(res.data);
    } catch (err) {
      console.error("Erreur fetch crédits:", err);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchCredits();
  }, []);

  const clientSales = selectedClient
    ? sales.filter((s) => s.nomClient === selectedClient)
    : [];

  const clientCredits = selectedClient
    ? credits.filter((c) => c.clientName === selectedClient)
    : [];

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Détails Clients
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6">Sélectionner un client :</Typography>
        {clients.map((c) => (
          <Button
            key={c}
            variant={c === selectedClient ? "contained" : "outlined"}
            sx={{ mr: 2, mt: 1 }}
            onClick={() => setSelectedClient(c)}
          >
            {c}
          </Button>
        ))}
      </Box>

      {selectedClient && (
        <>
          <Typography variant="h5" gutterBottom>
            Ventes et Crédits de {selectedClient}
          </Typography>

          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date Vente</TableCell>
                  <TableCell>Médicament</TableCell>
                  <TableCell>Quantité</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientSales.map((s) => (
                  <TableRow key={s.salesID}>
                    <TableCell>{new Date(s.date).toLocaleString()}</TableCell>
                    <TableCell>{s.medicines}</TableCell>
                    <TableCell>{s.totalArticles}</TableCell>
                    <TableCell>{s.totalPrice.toFixed(2)} MAD</TableCell>
                    <TableCell>{s.typeDeVente}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>
            Historique Crédits
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date Création</TableCell>
                  <TableCell>Montant Total</TableCell>
                  <TableCell>Montant Restant</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientCredits.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {new Date(c.dateCreation).toLocaleString()}
                    </TableCell>
                    <TableCell>{c.montantTotal.toFixed(2)} MAD</TableCell>
                    <TableCell>{c.montantRestant.toFixed(2)} MAD</TableCell>
                    <TableCell>
                      {c.estPaye ? (
                        <Typography color="green">Payé</Typography>
                      ) : (
                        <Typography color="orange">En cours</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default FicheClient;
