import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LogicPage from "./LogicPage";
import PharmaApp from "./PharmaApp";
import AjoutProduit from "./AjoutProduit";
import HistoriqueVentes from "./Ventehistoriques";
import Statistique from "./Statistique";
import GestionCommands from "./GestionCommands";
import GestionStock from "./GestionStock";
import GestionCredit from "./Credit";
import SettingsPage from "./Reglages";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LogicPage />} />
        <Route path="/pharma" element={<PharmaApp />} />
        <Route path="/Venteshistorique" element={<HistoriqueVentes />} />
        <Route path="/ajout-produit" element={<AjoutProduit />} />
        <Route path="/Statistiques" element={<Statistique />} />
        <Route path="/Commandes" element={<GestionCommands />} />
        <Route path="/Stock" element={<GestionStock />} />
        <Route path="/Credit" element={<GestionCredit />} />
        <Route path="/Reglages" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}
