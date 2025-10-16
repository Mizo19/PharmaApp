import { FaCapsules } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  FaBox,
  FaMoneyBillWave,
  FaClipboardList,
  FaChartBar,
  FaPlus,
  FaTruck,
  FaSignOutAlt,
  FaCog,
} from "react-icons/fa";

interface HeaderProps {
  titre: string;
}

const Header = ({ titre }: HeaderProps) => {
  const navigate = useNavigate();

  const rawUser = localStorage.getItem("connectedUser");
  let utilisateur = "Utilisateur inconnu";

  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      utilisateur =
        parsed.nomUtilisateur ||
        parsed.NomUtilisateur ||
        parsed.nom ||
        parsed.username ||
        rawUser ||
        "Utilisateur inconnu";
    } catch {
      utilisateur = rawUser;
    }
  }

  const getInitials = (name: string) => {
    if (!name || typeof name !== "string") return "?";
    const trimmed = name.trim();
    if (trimmed === "") return "?";

    const words = trimmed.split(" ");
    return words.length === 1
      ? words[0][0].toUpperCase()
      : (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const handleAjoutProduit = () => navigate("/ajout-produit");
  const handleLogout = () => navigate("/");
  const handlehome = () => navigate("/pharma");
  const handleVentes = () => navigate("/Venteshistorique");
  const handleStock = () => navigate("/Stock");
  const handleSetting = () => navigate("/Reglages");
  const handleStatisiques = () => navigate("/Statistiques");
  const handleCommandes = () => navigate("/Commandes");
  const handlecredit = () => navigate("/Credit");

  return (
    <div className="relative bg-gradient-to-r from-[#1976d2] to-[#1565c0] text-white px-6 py-3 shadow-2xl font-serif">
      {/* Subtle top border accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-blue-300 to-yellow-400"></div>

      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        {/* Left: Logo + Title */}
        <div
          className="flex items-center space-x-2 cursor-pointer hover:scale-105 transition-transform duration-200"
          onClick={handlehome}
        >
          <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm">
            <FaCapsules className="text-2xl text-yellow-300" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold tracking-tight">
              PharmaPro
            </span>
            <span className="text-xs opacity-90">
              Pharmacie El Abawain • {titre}
            </span>
          </div>
        </div>

        {/* Center: Menu */}
        <div className="flex space-x-1 text-xs font-medium">
          <button
            className="hover:bg-white/15 transition-all duration-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:shadow-lg backdrop-blur-sm"
            onClick={handleStock}
          >
            <FaBox className="text-sm" /> Stock
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:shadow-lg backdrop-blur-sm"
            onClick={handlecredit}
          >
            <FaMoneyBillWave className="text-sm" /> Crédit
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:shadow-lg backdrop-blur-sm"
            onClick={handleVentes}
          >
            <FaClipboardList className="text-sm" /> Inventaire
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:shadow-lg backdrop-blur-sm"
            onClick={handleStatisiques}
          >
            <FaChartBar className="text-sm" /> Stats
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:shadow-lg backdrop-blur-sm"
            onClick={handleAjoutProduit}
          >
            <FaPlus className="text-sm" /> Produit
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:shadow-lg backdrop-blur-sm"
            onClick={handleCommandes}
          >
            <FaTruck className="text-sm" /> Commandes
          </button>
        </div>

        {/* Right: Settings, Logout & User */}
        <div className="flex items-center space-x-2">
          <button
            className="hover:bg-white/15 transition-all duration-200 p-1.5 rounded-lg hover:shadow-lg backdrop-blur-sm"
            onClick={handleSetting}
            title="Réglages"
          >
            <FaCog className="text-base" />
          </button>
          <button
            className="hover:bg-red-500/80 transition-all duration-200 p-1.5 rounded-lg hover:shadow-lg backdrop-blur-sm"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <FaSignOutAlt className="text-base" />
          </button>

          {/* User Badge */}
          <div className="flex items-center space-x-2 bg-white/10 px-2.5 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center font-bold text-[#1976d2] text-xs shadow-md">
              {getInitials(utilisateur)}
            </div>
            <span className="text-xs font-semibold">Dr. {utilisateur}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
