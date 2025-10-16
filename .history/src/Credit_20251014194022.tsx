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
import Header from "./header";

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

interface Paiement {
  id: number;
  creditId: number;
  montant: number;
  datePaiement: string;
}

const FicheClient: React.FC = () => {
  const [clients, setClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const [sales, setSales] = useState<Sale[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, creditsRes] = await Promise.all([
          axios.get<Sale[]>("http://localhost:7194/api/sales"),
          axios.get<Credit[]>("http://localhost:7194/api/credits"),
        ]);

        setSales(salesRes.data);
        setCredits(creditsRes.data);

        // Extraire liste unique de clients
        const clientNames = Array.from(
          new Set([
            ...salesRes.data.map((s) => s.nomClient),
            ...creditsRes.data.map((c) => c.clientName),
          ])
        );
        setClients(clientNames);
      } catch (err) {
        console.error("Erreur fetch données:", err);
      }
    };

    fetchData();
  }, []);

  // Filtrer les ventes et crédits pour le client sélectionné
  const clientSales = selectedClient
    ? sales.filter((s) => s.nomClient === selectedClient)
    : [];
  const clientCredits = selectedClient
    ? credits.filter((c) => c.clientName === selectedClient)
    : [];

  // Fonction pour récupérer tous les paiements d'un crédit
  const fetchPaiementsCredit = async (creditId: number) => {
    try {
      const res = await axios.get<Paiement[]>(
        `http://localhost:7194/api/credits/${creditId}/paiements`
      );
      return res.data;
    } catch (err) {
      console.error("Erreur fetch paiements:", err);
      return [];
    }
  };

  // Charger paiements pour le client sélectionné
  useEffect(() => {
    if (!selectedClient) return;

    const loadPaiements = async () => {
      const allPaiements: Paiement[] = [];
      for (const credit of clientCredits) {
        const paiementsCredit = await fetchPaiementsCredit(credit.id);
        allPaiements.push(...paiementsCredit);
      }
      setPaiements(allPaiements);
    };
    loadPaiements();
  }, [selectedClient, clientCredits]);

  return (
    <Box sx={{ p: 4 }}>
      <Header titre="Fiche Client" />
      <Typography variant="h4" gutterBottom>
        Sélectionner un client
      </Typography>
      <Box sx={{ mb: 4 }}>
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
            Ventes de {selectedClient}
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date Vente</TableCell>
                  <TableCell>Médicament</TableCell>
                  <TableCell>Quantité</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Type de Vente</TableCell>
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

          <Typography variant="h5" gutterBottom>
            Crédits et Paiements
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date Crédit</TableCell>
                  <TableCell>Montant Total</TableCell>
                  <TableCell>Montant Restant</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Paiements</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientCredits.map((c) => {
                  const paiementsCredit = paiements.filter(
                    (p) => p.creditId === c.id
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        {new Date(c.dateCreation).toLocaleDateString()}
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
                      <TableCell>
                        {paiementsCredit.length > 0 ? (
                          <ul>
                            {paiementsCredit.map((p) => (
                              <li key={p.id}>
                                {p.montant.toFixed(2)} MAD -{" "}
                                {new Date(p.datePaiement).toLocaleString()}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "Aucun paiement"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default FicheClient;
