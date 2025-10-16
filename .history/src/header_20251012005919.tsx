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
  utilisateur: string;
  titre: string;
}

const Header = ({ utilisateur, titre }: HeaderProps) => {
  const navigate = useNavigate();

  const handleAjoutProduit = () => navigate("/ajout-produit");
  const handleLogout = () => navigate("/");
  const handlehome = () => navigate("/pharma");
  const handleVentes = () => navigate("/Venteshistorique");
  const handleStock = () => navigate("/Stock");
  const handleSetting = () => navigate("/Reglages");

  const handleStatisiques = () => navigate("/Statistiques");
  const handleCommandes = () => navigate("/Commandes");
  const handlecredit = () => navigate("/Credit");

  const getInitials = (name: string) => {
    const words = name.trim().split(" ");
    return words.length === 1
      ? words[0][0].toUpperCase()
      : (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between bg-[#1976d2] text-white px-6 py-4 rounded-lg shadow-lg font-serif">
      {/* Left: Logo + Title */}
      <div
        className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handlehome}
      >
        <FaCapsules className="text-4xl" />
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-extrabold">PharmaPro</span>
          <span className="text-sm">Pharmacie El Abawain - {titre}</span>
        </div>
      </div>

      {/* Center: Menu */}
      <div className="flex space-x-4 text-sm font-semibold">
        <button
          className="cursor-pointer hover:bg-white/20 transition-colors px-3 py-2 rounded-md flex items-center gap-2"
          onClick={handleStock}
        >
          <FaBox /> Gestion Stock
        </button>
        <button
          className="cursor-pointer hover:bg-white/20 transition-colors px-3 py-2 rounded-md flex items-center gap-2"
          onClick={handlecredit}
        >
          <FaMoneyBillWave /> Crédit
        </button>
        <button
          className="cursor-pointer hover:bg-white/20 transition-colors px-3 py-2 rounded-md flex items-center gap-2"
          onClick={handleVentes}
        >
          <FaClipboardList /> Inventaire
        </button>
        <button
          className="cursor-pointer hover:bg-white/20 transition-colors px-3 py-2 rounded-md flex items-center gap-2"
          onClick={handleStatisiques}
        >
          <FaChartBar /> Statistique
        </button>
        <button
          className="cursor-pointer hover:bg-white/20 transition-colors px-3 py-2 rounded-md flex items-center gap-2"
          onClick={handleAjoutProduit}
        >
          <FaPlus /> Ajout Produit
        </button>
        <button
          className="cursor-pointer hover:bg-white/20 transition-colors px-3 py-2 rounded-md flex items-center gap-2"
          onClick={handleCommandes}
        >
          <FaTruck /> Commandes
        </button>
      </div>

      {/* Right: Settings, Logout & User Avatar */}
      <div className="flex items-center space-x-4">
        <button
          className="cursor-pointer hover:bg-white/20 transition-colors px-3 py-2 rounded-md flex items-center gap-2 text-sm font-semibold"
          onClick={handleSetting}
        >
          <FaCog /> Réglages
        </button>
        <button
          className="cursor-pointer hover:bg-white/20 transition-colors px-3 py-2 rounded-md flex items-center gap-2 text-sm font-semibold"
          onClick={handleLogout}
        >
          <FaSignOutAlt /> Déconnexion
        </button>

        <div className="flex items-center space-x-3 ml-2">
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-[#1976d2]">
            {getInitials(utilisateur)}
          </div>
          <span className="text-sm font-bold">Dr. {utilisateur}</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
