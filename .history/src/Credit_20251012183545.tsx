import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "./header";
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
  TextField,
  Typography,
} from "@mui/material";

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

const GestionCredit: React.FC = () => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [montantPaiement, setMontantPaiement] = useState<number>(0);
  const [paiements, setPaiements] = useState<Paiement[]>([]);

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

  const fetchPaiements = async (creditId: number) => {
    try {
      const res = await axios.get<Paiement[]>(
        `http://localhost:7194/api/credits/${creditId}/paiements`
      );
      setPaiements(res.data);
    } catch (err) {
      console.error("Erreur fetch paiements:", err);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleSelectCredit = (credit: Credit) => {
    setSelectedCredit(credit);
    setMontantPaiement(0);
    fetchPaiements(credit.id);
  };

  const handlePay = async (payerTout = false) => {
    if (!selectedCredit || montantPaiement <= 0) return;
    const montant = payerTout ? selectedCredit.montantRestant : montantPaiement;

    try {
      const res = await axios.post(
        `http://localhost:7194/api/credits/${selectedCredit.id}/payer`,
        { montant }
      );

      // Met à jour le crédit localement
      setCredits((prev) =>
        prev.map((c) =>
          c.id === selectedCredit.id ? { ...c, ...res.data } : c
        )
      );

      // Recharge la liste des paiements
      fetchPaiements(selectedCredit.id);

      setMontantPaiement(0);
    } catch (err) {
      console.error("Erreur paiement:", err);
    }
  };

  return (
    <Box sx={{ padding: 4 }}>
      <Header titre="Gestion Crédit" />
      <Typography variant="h4" gutterBottom>
        Crédits Clients
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#1976d2" }}>
            <TableRow>
              <TableCell sx={{ color: "white" }}>Client</TableCell>
              <TableCell sx={{ color: "white" }}>Montant Total</TableCell>
              <TableCell sx={{ color: "white" }}>Montant Restant</TableCell>
              <TableCell sx={{ color: "white" }}>Date</TableCell>
              <TableCell sx={{ color: "white" }}>Statut</TableCell>
              <TableCell sx={{ color: "white" }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {credits.map((credit) => (
              <TableRow key={credit.id}>
                <TableCell>{credit.clientName}</TableCell>
                <TableCell>
                  {credit.montantTotal.toLocaleString()} MAD
                </TableCell>
                <TableCell>
                  {credit.montantRestant.toLocaleString()} MAD
                </TableCell>
                <TableCell>
                  {new Date(credit.dateCreation).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {credit.estPaye ? (
                    <Typography color="green">Payé</Typography>
                  ) : (
                    <Typography color="orange">En cours</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {!credit.estPaye && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleSelectCredit(credit)}
                    >
                      Gérer Paiement
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedCredit && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Paiement pour {selectedCredit.clientName}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <TextField
              label="Montant à payer"
              type="number"
              value={montantPaiement}
              onChange={(e) => setMontantPaiement(Number(e.target.value))}
              inputProps={{
                min: 0,
                max: selectedCredit?.montantRestant ?? 0,
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => handlePay(false)}
            >
              Payer
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => handlePay(true)}
            >
              Payer Tout
            </Button>
          </Box>

          <Typography variant="h6" gutterBottom>
            Historique des paiements
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Montant</TableCell>
                  <TableCell>Date Paiement</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paiements.length > 0 ? (
                  paiements.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.montant.toLocaleString()} MAD</TableCell>
                      <TableCell>
                        {new Date(p.datePaiement).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      Aucun paiement pour ce crédit.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default GestionCredit;
