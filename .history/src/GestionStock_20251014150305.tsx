import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Box,
  Chip,
  Stack,
} from "@mui/material";
import Header from "./header";

interface Medicine {
  id: number;
  code: string | null;
  nom_medicament: string | null;
  forme: string | null;
  presentation: string | null;
  ppv: number | null;
  ph: string | null;
  quantite: number | null;
  datE_PER: string | null;
  categorie: string | null;
}

const GestionStock: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
    null
  );
  const [dialogState, setDialogState] = useState<Partial<Medicine>>({});
  const [open, setOpen] = useState(false);
  const [lastEditedId, setLastEditedId] = useState<number | null>(null);
  const [categorieFilter, setCategorieFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState<string>("");
  const tableRef = useRef<HTMLDivElement>(null);

  // 🔹 Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // 🔹 Fetch medicines
  useEffect(() => {
    axios
      .get<Medicine[]>("http://localhost:7194/api/medicines")
      .then((res) => setMedicines(res.data))
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  // 🔹 Load last edited ID from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem("lastEditedId");
    if (savedId) setLastEditedId(Number(savedId));
  }, []);

  // 🔹 Scroll to last edited row
  useEffect(() => {
    if (lastEditedId && tableRef.current) {
      const row = tableRef.current.querySelector(
        `tr[data-id='${lastEditedId}']`
      );
      if (row)
        (row as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }
  }, [lastEditedId, medicines]);

  // 🔹 Filtered and sorted medicines
  const filteredMedicines = useMemo(() => {
    return medicines
      .filter((m) => (categorieFilter ? m.categorie === categorieFilter : true))
      .filter((m) =>
        debouncedSearch
          ? (m.nom_medicament || "")
              .toLowerCase()
              .includes(debouncedSearch.toLowerCase())
          : true
      )
      .sort((a, b) =>
        (a.nom_medicament || "").localeCompare(b.nom_medicament || "")
      );
  }, [medicines, categorieFilter, debouncedSearch]);

  // 🔹 Stats
  const productsInStock = filteredMedicines.filter(
    (m) => (m.quantite ?? 0) > 0
  ).length;
  const totalStockValue = filteredMedicines.reduce(
    (acc, m) => acc + (m.ppv ?? 0) * (m.quantite ?? 0),
    0
  );

  // 🔹 Handlers
  const handleEdit = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setDialogState(medicine);
    setOpen(true);
  };

  const handleDialogChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedValue = ["quantite", "ppv", "ph"].includes(name)
      ? Number(value)
      : value;
    setDialogState((prev) => ({ ...prev, [name]: updatedValue }));
  };

  const handleSave = async () => {
    if (!selectedMedicine) return;
    try {
      await axios.put(
        `http://localhost:7194/api/medicines/${selectedMedicine.id}`,
        dialogState
      );
      setMedicines((prev) =>
        prev.map((m) =>
          m.id === selectedMedicine.id ? { ...m, ...dialogState } : m
        )
      );
      setLastEditedId(selectedMedicine.id);
      localStorage.setItem("lastEditedId", selectedMedicine.id.toString());
      setOpen(false);
    } catch (error) {
      console.error("Error updating medicine:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:7194/api/medicines/${id}`);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
      if (id === lastEditedId) {
        setLastEditedId(null);
        localStorage.removeItem("lastEditedId");
      }
    } catch (error) {
      console.error("Error deleting medicine:", error);
    }
  };

  // 🔹 Handle duplication
  const handleDuplicate = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setNewExpiryDate("");
    setDuplicateDialogOpen(true);
  };

  const confirmDuplicate = async () => {
    if (!selectedMedicine || !newExpiryDate.trim()) return;

    try {
      const newMedicine = {
        ...selectedMedicine,
        id: undefined, // Laisse le backend générer un nouvel ID
        datE_PER: newExpiryDate,
      };

      const res = await axios.post(
        "http://localhost:7194/api/medicines",
        newMedicine
      );
      setMedicines((prev) => [...prev, res.data]);
      setLastEditedId(res.data.id);
      localStorage.setItem("lastEditedId", res.data.id.toString());
      setDuplicateDialogOpen(false);
    } catch (error) {
      console.error("Erreur duplication:", error);
    }
  };

  return (
    <Box className="bg-gradient-to-br from-emerald-50 to-emerald-100" p={3}>
      <Header titre="Gestion Stocks" />
      <Typography variant="h4" mb={3} fontWeight="bold">
        Gestion du Stock
      </Typography>

      {/* Toolbar + Stats */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        mb={3}
        alignItems="center"
      >
        <TextField
          label="Recherche par nom"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 250 }}
        />
        <TextField
          select
          label="Filtrer par catégorie"
          value={categorieFilter}
          onChange={(e) => setCategorieFilter(e.target.value)}
          SelectProps={{ native: true }}
          sx={{ minWidth: 200 }}
        >
          <option value="">Toutes</option>
          <option value="Suspension / Sirop">Suspension / Sirop</option>
          <option value="Crème / Gel / Pommade">Crème / Gel / Pommade</option>
          <option value="Comprimé">Comprimé</option>
          <option value="Gélule">Gélule</option>
          <option value="Collyre">Collyre</option>
          <option value="Autre">Autre</option>
        </TextField>
        <Chip
          label={`Produits en stock: ${productsInStock}`}
          color="success"
          variant="outlined"
        />
        <Chip
          label={`Valeur totale: ${totalStockValue.toLocaleString()} MAD`}
          color="primary"
          variant="outlined"
        />
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 500 }} ref={tableRef}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {[
                "ID",
                "Code",
                "Nom",
                "Forme",
                "Catégorie",
                "Quantité",
                "PPV",
                "PH",
                "Date Péremption",
                "Actions",
              ].map((head) => (
                <TableCell key={head} sx={{ fontWeight: "bold", fontSize: 15 }}>
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMedicines.map((m) => (
              <TableRow
                key={m.id}
                data-id={m.id}
                sx={{
                  backgroundColor:
                    m.id === lastEditedId ? "#e0f7fa" : "inherit",
                  "&:hover": { backgroundColor: "#f1f8e9" },
                }}
              >
                <TableCell>{m.id}</TableCell>
                <TableCell>{m.code}</TableCell>
                <TableCell sx={{ fontSize: 14 }}>{m.nom_medicament}</TableCell>
                <TableCell>{m.forme}</TableCell>
                <TableCell>{m.categorie}</TableCell>
                <TableCell>{m.quantite}</TableCell>
                <TableCell>{m.ppv}</TableCell>
                <TableCell>{m.ph}</TableCell>
                <TableCell>{m.datE_PER}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleEdit(m)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => handleDuplicate(m)}
                    >
                      Dupliquer
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDelete(m.id)}
                    >
                      Supprimer
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Modifier le Médicament</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {[
              "code",
              "nom_medicament",
              "forme",
              "quantite",
              "ppv",
              "ph",
              "datE_PER",
            ].map((field) => (
              <TextField
                key={field}
                label={field}
                name={field}
                type={
                  ["quantite", "ppv", "ph"].includes(field) ? "number" : "text"
                }
                value={(dialogState as any)[field] ?? ""}
                onChange={handleDialogChange}
                fullWidth
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
      >
        <DialogTitle>Dupliquer le Médicament</DialogTitle>
        <DialogContent>
          <Typography>
            Entrer la nouvelle date de péremption pour{" "}
            <strong>{selectedMedicine?.nom_medicament}</strong>
          </Typography>
          <TextField
            label="Nouvelle Date Péremption"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={newExpiryDate}
            onChange={(e) => setNewExpiryDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={confirmDuplicate}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GestionStock;
