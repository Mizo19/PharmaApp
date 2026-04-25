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
  Autocomplete,
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
  datE_PER: string | null; // MMYYYY
  categorie: string | null;
}

const PAGE_SIZE = 50;

const GestionStock: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [dialogState, setDialogState] = useState<Partial<Medicine>>({});
  const [open, setOpen] = useState(false);
  const [lastEditedId, setLastEditedId] = useState<number | null>(null);
  const [categorieFilter, setCategorieFilter] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState<string>("");
  const [page, setPage] = useState(1);

  const tableRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch medicines
  useEffect(() => {
    axios
      .get<Medicine[]>("http://localhost:7194/api/medicines")
      .then((res) => {
        setMedicines(res.data);

        // Extract unique categories
        const uniqueCats = Array.from(
          new Set(res.data.map((m) => m.categorie).filter(Boolean))
        ) as string[];
        setCategories(uniqueCats);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  // Load last edited ID from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem("lastEditedId");
    if (savedId) setLastEditedId(Number(savedId));
  }, []);

  // Scroll to last edited row
  useEffect(() => {
    if (lastEditedId && tableRef.current) {
      const row = tableRef.current.querySelector(`tr[data-id='${lastEditedId}']`);
      if (row)
        (row as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }
  }, [lastEditedId, medicines]);

  // Filtered and sorted medicines
  const filteredMedicines = useMemo(() => {
    return medicines
      .filter((m) => (categorieFilter ? m.categorie === categorieFilter : true))
      .filter((m) =>
        debouncedSearch
          ? (m.nom_medicament || "").toLowerCase().includes(debouncedSearch.toLowerCase())
          : true
      )
      .sort((a, b) => (a.nom_medicament || "").localeCompare(b.nom_medicament || ""));
  }, [medicines, categorieFilter, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil(filteredMedicines.length / PAGE_SIZE);
  const paginatedMedicines = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMedicines.slice(start, start + PAGE_SIZE);
  }, [filteredMedicines, page]);

  // Stats
  const totalProducts = filteredMedicines.length;
  const productsInStock = filteredMedicines.filter((m) => (m.quantite ?? 0) > 0).length;
  const productsOutOfStock = totalProducts - productsInStock;
  const totalStockValue = filteredMedicines.reduce(
    (acc, m) => acc + (m.ppv ?? 0) * (m.quantite ?? 0),
    0
  );

  // Handlers
  const handleEdit = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setDialogState(medicine);
    setOpen(true);
  };

  const handleDialogChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedValue = ["quantite", "ppv"].includes(name) ? Number(value) : value;
    setDialogState((prev) => ({ ...prev, [name]: updatedValue }));
  };

  const handleSave = async () => {
    if (!selectedMedicine) return;

    const payload = {
       ID: selectedMedicine.id,
  CODE: dialogState.code,
  Nom_medicament: dialogState.nom_medicament,
  FORME: dialogState.forme,
  PRESENTATION: dialogState.presentation,
  PPV: dialogState.ppv,
  PH: dialogState.ph === null || dialogState.ph === undefined || dialogState.ph === ""
    ? null
    : String(dialogState.ph),
 Quantite: dialogState.quantite,
  DATE_PER: dialogState.datE_PER,
  categorie: dialogState.categorie
    };

      console.log("Sending payload to backend:", JSON.stringify(payload, null, 2));

    try {
      await axios.put(`http://localhost:7194/api/medicines/${selectedMedicine.id}`, payload);

      setMedicines((prev) =>
        prev.map((m) => (m.id === selectedMedicine.id ? { ...m, ...dialogState } : m))
      );
      setLastEditedId(selectedMedicine.id);
      localStorage.setItem("lastEditedId", selectedMedicine.id.toString());
      setOpen(false);

      // Add new category if it doesn't exist
      if (dialogState.categorie && !categories.includes(dialogState.categorie)) {
        setCategories((prev) => [...prev, dialogState.categorie as string]);
      }
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
        id: undefined,
        datE_PER: newExpiryDate, // MMYYYY
      };

      const res = await axios.post("http://localhost:7194/api/medicines", newMedicine);
      setMedicines((prev) => [...prev, res.data]);
      setLastEditedId(res.data.id);
      localStorage.setItem("lastEditedId", res.data.id.toString());
      setDuplicateDialogOpen(false);
    } catch (error) {
      console.error("Erreur duplication:", error);
    }
  };

  return (
    <Box className="min-h-screen bg-slate-50">
      <Header titre="Gestion Stocks" />
      <Box sx={{ maxWidth: 1600, mx: "auto", px: 3, pt: 4, pb: 5 }}>
        <Typography
          variant="h5"
          mb={3}
          sx={{ fontWeight: 600, color: "#0f172a", letterSpacing: "-0.01em" }}
        >
          Gestion du Stock
        </Typography>

        {/* Toolbar + Stats */}
        <Box
          sx={{
            bgcolor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            p: 2.5,
            mb: 3,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ sm: "center" }}
            flexWrap="wrap"
          >
            <TextField
              size="small"
              label="Recherche par nom"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 260 }}
            />
            <TextField
              size="small"
              select
              label="Filtrer par catégorie"
              value={categorieFilter}
              onChange={(e) => setCategorieFilter(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ minWidth: 220 }}
            >
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </TextField>
            <Box sx={{ flex: 1 }} />
            <Chip
              label={`${totalProducts.toLocaleString()} au total`}
              size="small"
              sx={{
                bgcolor: "#f1f5f9",
                color: "#334155",
                fontWeight: 600,
                border: "1px solid #e2e8f0",
              }}
            />
            <Chip
              label={`${productsInStock.toLocaleString()} en stock`}
              size="small"
              sx={{
                bgcolor: "#ecfdf5",
                color: "#047857",
                fontWeight: 600,
                border: "1px solid #a7f3d0",
              }}
            />
            <Chip
              label={`${productsOutOfStock.toLocaleString()} hors stock`}
              size="small"
              sx={{
                bgcolor: "#fffbeb",
                color: "#b45309",
                fontWeight: 600,
                border: "1px solid #fcd34d",
              }}
            />
            <Chip
              label={`Valeur: ${totalStockValue.toLocaleString()} MAD`}
              size="small"
              sx={{
                bgcolor: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: 600,
                border: "1px solid #bfdbfe",
              }}
            />
          </Stack>
        </Box>

        {/* Table */}
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: 560,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
          ref={tableRef}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {["ID", "Code", "Nom", "Forme", "Présentation", "Catégorie", "Quantité", "PPV", "PH", "Péremption", "Actions"].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#64748b",
                      bgcolor: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedMedicines.map((m) => (
                <TableRow
                  key={m.id}
                  data-id={m.id}
                  sx={{
                    backgroundColor: m.id === lastEditedId ? "#ecfdf5" : "inherit",
                    "&:hover": { backgroundColor: "#f8fafc" },
                    "& td": { fontSize: 13.5, color: "#334155", borderBottom: "1px solid #f1f5f9" },
                  }}
                >
                  <TableCell sx={{ color: "#94a3b8 !important", fontFamily: "monospace" }}>{m.id}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>{m.code}</TableCell>
                  <TableCell sx={{ color: "#0f172a !important", fontWeight: 500 }}>{m.nom_medicament}</TableCell>
                  <TableCell>{m.forme}</TableCell>
                  <TableCell>{m.presentation}</TableCell>
                  <TableCell>{m.categorie}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{m.quantite}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{m.ppv}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{m.ph}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{m.datE_PER}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => handleEdit(m)} sx={{ textTransform: "none", borderRadius: 2 }}>
                        Modifier
                      </Button>
                      <Button size="small" variant="outlined" color="warning" onClick={() => handleDuplicate(m)} sx={{ textTransform: "none", borderRadius: 2 }}>
                        Dupliquer
                      </Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(m.id)} sx={{ textTransform: "none", borderRadius: 2 }}>
                        Supprimer
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Stack direction="row" spacing={2} mt={2.5} alignItems="center" justifyContent="flex-end">
          <Button
            size="small"
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Précédent
          </Button>
          <Typography sx={{ fontSize: 13, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
            Page {page} / {totalPages}
          </Typography>
          <Button
            size="small"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Suivant
          </Button>
        </Stack>
      </Box>

      {/* Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier le Médicament</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {["code","nom_medicament","forme","presentation","quantite","ppv","ph","datE_PER","categorie"].map((field) => (
              field === "categorie" ? (
                <Autocomplete
                  key={field}
                  freeSolo
                  options={categories}
                  value={dialogState.categorie || ""}
                  onChange={(e, val) => setDialogState((prev) => ({ ...prev, categorie: val || "" }))}
                  onInputChange={(e, val) => setDialogState((prev) => ({ ...prev, categorie: val }))}
                  renderInput={(params) => <TextField {...params} label="Catégorie" fullWidth />}
                />
              ) : (
                <TextField
                  key={field}
                  label={field}
                  name={field}
                  type={["quantite","ppv","ph"].includes(field) ? "number" : "text"}
                  value={(dialogState as any)[field] ?? ""}
                  onChange={handleDialogChange}
                  fullWidth
                />
              )
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Enregistrer</Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onClose={() => setDuplicateDialogOpen(false)}>
        <DialogTitle>Dupliquer le Médicament</DialogTitle>
        <DialogContent>
          <Typography>
            Entrer la nouvelle date de péremption (MMYYYY) pour <strong>{selectedMedicine?.nom_medicament}</strong>
          </Typography>
          <TextField
            label="Nouvelle Date Péremption"
            type="text"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={newExpiryDate}
            onChange={(e) => setNewExpiryDate(e.target.value)}
            placeholder="MMYYYY"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={confirmDuplicate}>Confirmer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GestionStock;
