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
        className="flex items-center space-x-3 cursor-pointer"
        onClick={handlehome}
      >
        <FaCapsules className="text-4xl" />
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-extrabold">PharmaPro</span>
          <span className="text-sm">Pharmacie El Abawain - {titre}</span>
        </div>
      </div>

      {/* Center: Menu */}
      <div className="flex space-x-6 text-base font-semibold">
        <span
          className="cursor-pointer hover:text-yellow-300 flex items-center gap-1"
          onClick={handleStock}
        >
          <FaBox /> Gestion Stock
        </span>
        <span
          className="cursor-pointer hover:text-yellow-300 flex items-center gap-1"
          onClick={handlecredit}
        >
          <FaMoneyBillWave /> Crédit
        </span>
        <span
          className="cursor-pointer hover:text-yellow-300 flex items-center gap-1"
          onClick={handleVentes}
        >
          <FaClipboardList /> Inventaire
        </span>
        <span
          className="cursor-pointer hover:text-yellow-300 flex items-center gap-1"
          onClick={handleStatisiques}
        >
          <FaChartBar /> Statistique
        </span>
        <span
          className="cursor-pointer hover:text-yellow-300 flex items-center gap-1"
          onClick={handleAjoutProduit}
        >
          <FaPlus /> Ajout Produit
        </span>
        <span
          className="cursor-pointer hover:text-yellow-300 flex items-center gap-1"
          onClick={handleCommandes}
        >
          <FaTruck /> Gestion Commandes
        </span>
        <span
          className="cursor-pointer hover:text-yellow-300 flex items-center gap-1"
          onClick={handleLogout}
        >
          <FaSignOutAlt /> Logout
        </span>
      </div>

      {/* Right: User Avatar + Welcome */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center font-bold">
          {getInitials(utilisateur)}
        </div>
        <span className="text-lg font-extrabold">
          Bienvenue Dr. {utilisateur}
        </span>
      </div>
    </div>
  );
};

export default Header;
