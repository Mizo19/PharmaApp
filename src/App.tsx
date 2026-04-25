import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LogicPage from "./LogicPage";
import PharmaApp from "./PharmaApp";
import AjoutProduit from "./AjoutProduit";
import HistoriqueVentes from "./Ventehistoriques";
import Statistique from "./Statistique";
import GestionCommands from "./GestionCommands";
import GestionStock from "./GestionStock";
import GestionCredit from "./Credit";
import SettingsPage from "./Reglages";
import MiseAJourPrix from "./MiseAJourPrix";
import ProchesPerimes from "./ProchesPerimes";

function ProtectedRoute({
  children,
  allowedForNonAdmin = false,
}: {
  children: React.ReactNode;
  allowedForNonAdmin?: boolean;
}) {
  const user = localStorage.getItem("connectedUser");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin && !allowedForNonAdmin) return <Navigate to="/pharma" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 🔑 Page de connexion */}
        <Route path="/" element={<LogicPage />} />

        {/* 👤 Accès utilisateur normal autorisé */}
        <Route
          path="/pharma"
          element={
            <ProtectedRoute allowedForNonAdmin>
              <PharmaApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Commandes"
          element={
            <ProtectedRoute allowedForNonAdmin>
              <GestionCommands />
            </ProtectedRoute>
          }
        />

        {/* 👑 Réservé aux admins */}
        <Route
          path="/ajout-produit"
          element={
            <ProtectedRoute allowedForNonAdmin>
              <AjoutProduit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Venteshistorique"
          element={
            <ProtectedRoute allowedForNonAdmin>
              <HistoriqueVentes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Statistiques"
          element={
            <ProtectedRoute>
              <Statistique />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Stock"
          element={
            <ProtectedRoute>
              <GestionStock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Credit"
          element={
            <ProtectedRoute allowedForNonAdmin>
              <GestionCredit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ProchesPerimes"
          element={
            <ProtectedRoute allowedForNonAdmin>
              <ProchesPerimes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/MiseAJourPrix"
          element={
            <ProtectedRoute>
              <MiseAJourPrix />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reglages"
          element={
            <ProtectedRoute >
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
