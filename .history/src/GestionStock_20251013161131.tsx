import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  alpha,
  Fade,
} from "@mui/material";
import {
  EditRounded,
  DeleteRounded,
  SearchRounded,
  Inventory2Rounded,
  AttachMoneyRounded,
  CategoryRounded,
  AddRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
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
  const tableRef = useRef<HTMLDivElement>(null);

  // 🔹 Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // 🔹 Fetch medicines
  useEffect(() => {
    axios
      .get<Medicine[]>("http://localhost:7194/api/medicames")
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
  const lowStockProducts = filteredMedicines.filter(
    (m) => (m.quantite ?? 0) > 0 && (m.quantite ?? 0) < 10
  ).length;

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
        `http://localhost:7194/api/medicames/${selectedMedicine.id}`,
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
      await axios.delete(`http://localhost:7194/api/medicames/${id}`);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
      if (id === lastEditedId) {
        setLastEditedId(null);
        localStorage.removeItem("lastEditedId");
      }
    } catch (error) {
      console.error("Error deleting medicine:", error);
    }
  };

  return (
    <Box
      className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen"
      p={3}
    >
      <Header titre="Gestion Stocks" />

      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Fade in timeout={1000}>
          <Box>
            <Typography variant="h3" fontWeight="800" mb={1}>
              📦 Gestion du Stock
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }} fontWeight="400">
              Gérez votre inventaire pharmaceutique avec précision et efficacité
            </Typography>
            <Box
              component="img"
              src="/api/placeholder/200/200"
              sx={{
                position: "absolute",
                right: -20,
                top: -20,
                opacity: 0.1,
                transform: "rotate(25deg)",
                width: 200,
                height: 200,
              }}
            />
          </Box>
        </Fade>
      </Box>

      {/* Stats Cards */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} mb={4}>
        <Card
          sx={{
            flex: 1,
            background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            color: "white",
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Inventory2Rounded sx={{ fontSize: 40, opacity: 0.8 }} />
              <Box>
                <Typography variant="h4" fontWeight="700">
                  {productsInStock}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Produits en stock
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card
          sx={{
            flex: 1,
            background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            color: "white",
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <AttachMoneyRounded sx={{ fontSize: 40, opacity: 0.8 }} />
              <Box>
                <Typography variant="h4" fontWeight="700">
                  {totalStockValue.toLocaleString()} MAD
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Valeur totale
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card
          sx={{
            flex: 1,
            background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            color: "white",
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <TrendingUpRounded sx={{ fontSize: 40, opacity: 0.8 }} />
              <Box>
                <Typography variant="h4" fontWeight="700">
                  {lowStockProducts}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Stock faible
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Toolbar */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", lg: "center" }}
          >
            <TextField
              placeholder="Rechercher un médicament..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                minWidth: 300,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              label="Catégorie"
              value={categorieFilter}
              onChange={(e) => setCategorieFilter(e.target.value)}
              SelectProps={{ native: true }}
              sx={{
                minWidth: 200,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CategoryRounded color="action" />
                  </InputAdornment>
                ),
              }}
            >
              <option value="">Toutes les catégories</option>
              <option value="Suspension / Sirop">Suspension / Sirop</option>
              <option value="Crème / Gel / Pommade">
                Crème / Gel / Pommade
              </option>
              <option value="Comprimé">Comprimé</option>
              <option value="Gélule">Gélule</option>
              <option value="Collyre">Collyre</option>
              <option value="Autre">Autre</option>
            </TextField>

            <Button
              variant="contained"
              startIcon={<AddRounded />}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              Nouveau
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 500 }} ref={tableRef}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  "ID",
                  "Code",
                  "Nom du Médicament",
                  "Forme",
                  "Catégorie",
                  "Quantité",
                  "PPV",
                  "PH",
                  "Date Péremption",
                  "Actions",
                ].map((head) => (
                  <TableCell
                    key={head}
                    sx={{
                      fontWeight: "800",
                      fontSize: 14,
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                    }}
                  >
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
                      m.id === lastEditedId ? alpha("#667eea", 0.1) : "inherit",
                    "&:hover": {
                      backgroundColor: alpha("#667eea", 0.05),
                      transform: "translateY(-1px)",
                      transition: "all 0.2s",
                    },
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <TableCell sx={{ fontWeight: "600" }}>{m.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.code || "N/A"}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: "600", fontSize: 14 }}>
                    {m.nom_medicament}
                  </TableCell>
                  <TableCell>{m.forme}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.categorie || "Non catégorisé"}
                      size="small"
                      sx={{
                        borderRadius: 1,
                        background: "linear-gradient(45deg, #4facfe, #00f2fe)",
                        color: "white",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={m.quantite}
                      size="small"
                      color={
                        (m.quantite ?? 0) === 0
                          ? "error"
                          : (m.quantite ?? 0) < 10
                          ? "warning"
                          : "success"
                      }
                      variant={(m.quantite ?? 0) < 10 ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: "600" }}>
                    {m.ppv ? `${m.ppv} MAD` : "N/A"}
                  </TableCell>
                  <TableCell>{m.ph}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.datE_PER || "N/A"}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(m)}
                        sx={{
                          background:
                            "linear-gradient(45deg, #4facfe, #00f2fe)",
                          color: "white",
                          "&:hover": {
                            transform: "scale(1.1)",
                            transition: "all 0.2s",
                          },
                        }}
                      >
                        <EditRounded fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(m.id)}
                        sx={{
                          background:
                            "linear-gradient(45deg, #ff6b6b, #ffa8a8)",
                          color: "white",
                          "&:hover": {
                            transform: "scale(1.1)",
                            transition: "all 0.2s",
                          },
                        }}
                      >
                        <DeleteRounded fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: "800",
          }}
        >
          ✏️ Modifier le Médicament
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {[
              { field: "code", label: "Code", type: "text" },
              {
                field: "nom_medicament",
                label: "Nom du Médicament",
                type: "text",
              },
              { field: "forme", label: "Forme", type: "text" },
              { field: "quantite", label: "Quantité", type: "number" },
              { field: "ppv", label: "PPV (MAD)", type: "number" },
              { field: "ph", label: "PH", type: "number" },
              { field: "datE_PER", label: "Date Péremption", type: "date" },
            ].map(({ field, label, type }) => (
              <TextField
                key={field}
                label={label}
                name={field}
                type={type}
                value={(dialogState as any)[field] ?? ""}
                onChange={handleDialogChange}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "white",
                  },
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 3,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            💾 Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GestionStock;
