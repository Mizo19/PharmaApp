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
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

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

interface Sale {
  salesID: number;
  date: string;
  medicines: string;
  totalArticles: number;
  totalPrice: number;
  typeDeVente: string;
  nomClient: string;
}

const GestionCredit: React.FC = () => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [montantPaiement, setMontantPaiement] = useState<number>(0);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Charger crédits
  const fetchCredits = async () => {
    try {
      const res = await axios.get<Credit[]>("http://localhost:7194/api/credits");
      setCredits(res.data);
    } catch (err) {
      console.error("Erreur fetch crédits:", err);
    }
  };

  // Charger paiements d'un crédit
  const fetchPaiements = async (creditId: number) => {
    try {
      const res = await axios.get<Paiement[]>(`http://localhost:7194/api/credits/${creditId}/paiements`);
      setPaiements(res.data);
    } catch (err) {
      console.error("Erreur fetch paiements:", err);
    }
  };

  // Charger toutes les ventes
  const fetchSales = async () => {
    try {
      const res = await axios.get<Sale[]>("http://localhost:7194/api/sales");
      setSales(res.data);
    } catch (err) {
      console.error("Erreur fetch ventes:", err);
    }
  };

  useEffect(() => {
    fetchCredits();
    fetchSales();
  }, []);

  const handleSelectCredit = (credit: Credit) => {
    setSelectedCredit(credit);
    setMontantPaiement(0);
    fetchPaiements(credit.id);
  };

  const handlePay = async (payerTout = false) => {
    if (!selectedCredit) return;

    const montant = payerTout ? selectedCredit.montantRestant : montantPaiement;
    if (montant <= 0) return;

    // Double confirmation popup
    const { isConfirmed } = await MySwal.fire({
      title: "Confirmer le paiement",
      html: `
        <p>Client: <strong>${selectedCredit.clientName}</strong></p>
        <p>Montant: <strong>${montant.toLocaleString()} MAD</strong></p>
        <p>${payerTout ? "Vous allez payer la totalité du crédit." : ""}</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, payer",
      cancelButtonText: "Annuler",
      reverseButtons: true,
    });

    if (!isConfirmed) return;

    try {
      const res = await axios.post(
        `http://localhost:7194/api/credits/${selectedCredit.id}/payer`,
        { montant }
      );

      // Update local state
      setCredits((prev) =>
        prev.map((c) =>
          c.id === selectedCredit.id
            ? { ...c, ...res.data, estPaye: payerTout ? true : res.data.estPaye }
            : c
        )
      );

      // Update selected credit
      setSelectedCredit((prev) =>
        prev
          ? { ...prev, montantRestant: payerTout ? 0 : prev.montantRestant - montant, estPaye: payerTout ? true : prev.estPaye }
          : prev
      );

      fetchPaiements(selectedCredit.id);
      setMontantPaiement(0);

      // Success toast
      MySwal.fire({
        icon: "success",
        title: "✅ Paiement enregistré",
        text: payerTout
          ? "Le crédit a été complètement payé !"
          : "Le paiement partiel a été enregistré.",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (err) {
      console.error("Erreur paiement:", err);
      MySwal.fire({
        icon: "error",
        title: "Erreur",
        text: "Le paiement n'a pas pu être enregistré.",
      });
    }
  };

  const headCellSx = {
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#64748b",
    bgcolor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  } as const;

  const bodyCellSx = {
    fontSize: 13.5,
    color: "#334155",
    borderBottom: "1px solid #f1f5f9",
  } as const;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc" }}>
      <Header titre="Gestion Crédit" />
      <Box sx={{ maxWidth: 1600, mx: "auto", px: 3, pt: 4, pb: 5 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 600, color: "#0f172a", mb: 3, letterSpacing: "-0.01em" }}
        >
          Crédits Clients
        </Typography>

        {/* Tableau Crédits */}
        <TableContainer
          component={Paper}
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={headCellSx}>Client</TableCell>
                <TableCell sx={{ ...headCellSx, display: "none" }}>Montant Total</TableCell>
                <TableCell sx={headCellSx}>Montant Restant</TableCell>
                <TableCell sx={headCellSx}>Date</TableCell>
                <TableCell sx={headCellSx}>Statut</TableCell>
                <TableCell sx={headCellSx} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {credits.map((credit) => (
                <TableRow key={credit.id} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                  <TableCell sx={{ ...bodyCellSx, color: "#0f172a", fontWeight: 500 }}>
                    {credit.clientName}
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, display: "none" }}>
                    {credit.montantTotal.toLocaleString()} MAD
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {credit.montantRestant.toLocaleString()} MAD
                  </TableCell>
                  <TableCell sx={bodyCellSx}>
                    {new Date(credit.dateCreation).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={bodyCellSx}>
                    {credit.estPaye ? (
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          px: 1.25,
                          py: 0.25,
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: "#ecfdf5",
                          color: "#047857",
                          border: "1px solid #a7f3d0",
                          borderRadius: 999,
                        }}
                      >
                        Payé
                      </Box>
                    ) : (
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          px: 1.25,
                          py: 0.25,
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: "#fffbeb",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                          borderRadius: 999,
                        }}
                      >
                        En cours
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="right">
                    {!credit.estPaye && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleSelectCredit(credit)}
                        sx={{
                          textTransform: "none",
                          bgcolor: "#059669",
                          borderRadius: 2,
                          boxShadow: "none",
                          "&:hover": { bgcolor: "#047857", boxShadow: "none" },
                        }}
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

        {/* Détails du crédit sélectionné */}
        {selectedCredit && (
          <>
            <Paper
              sx={{
                p: 3,
                mt: 4,
                border: "1px solid #e2e8f0",
                borderRadius: 3,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "#0f172a", mb: 2.5 }}
              >
                Paiement pour {selectedCredit.clientName}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
                <TextField
                  size="small"
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
                  onClick={() => handlePay(false)}
                  sx={{
                    textTransform: "none",
                    bgcolor: "#059669",
                    borderRadius: 2,
                    boxShadow: "none",
                    "&:hover": { bgcolor: "#047857", boxShadow: "none" },
                  }}
                >
                  Payer
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handlePay(true)}
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    borderColor: "#cbd5e1",
                    color: "#334155",
                    "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
                  }}
                >
                  Payer Tout
                </Button>
              </Box>

              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: "#475569", mb: 1.5 }}
              >
                Historique des paiements
              </Typography>
              <TableContainer sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Montant</TableCell>
                      <TableCell sx={headCellSx}>Date Paiement</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paiements.length > 0 ? (
                      paiements.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell sx={{ ...bodyCellSx, fontVariantNumeric: "tabular-nums" }}>
                            {p.montant.toLocaleString()} MAD
                          </TableCell>
                          <TableCell sx={bodyCellSx}>
                            {new Date(p.datePaiement).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ ...bodyCellSx, color: "#94a3b8", py: 3 }}>
                          Aucun paiement pour ce crédit.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Tableau des ventes / médicaments */}
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: "#0f172a", mt: 4, mb: 1.5 }}
            >
              Médicaments achetés par {selectedCredit.clientName}
            </Typography>
            <TableContainer
              component={Paper}
              sx={{
                border: "1px solid #e2e8f0",
                borderRadius: 3,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCellSx}>Date</TableCell>
                    <TableCell sx={headCellSx}>Médicament</TableCell>
                    <TableCell sx={headCellSx}>Quantité</TableCell>
                    <TableCell sx={headCellSx}>Prix Total</TableCell>
                    <TableCell sx={headCellSx}>Type de Vente</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales
                    .filter((s) => s.nomClient === selectedCredit.clientName)
                    .map((s) => (
                      <TableRow key={s.salesID} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                        <TableCell sx={bodyCellSx}>{new Date(s.date).toLocaleString()}</TableCell>
                        <TableCell sx={{ ...bodyCellSx, color: "#0f172a", fontWeight: 500 }}>
                          {s.medicines}
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx, fontVariantNumeric: "tabular-nums" }}>
                          {s.totalArticles}
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx, fontVariantNumeric: "tabular-nums" }}>
                          {s.totalPrice.toFixed(2)} MAD
                        </TableCell>
                        <TableCell sx={bodyCellSx}>{s.typeDeVente}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </Box>
  );
};

export default GestionCredit;
