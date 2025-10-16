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
import { useEffect, useState } from "react";

interface HeaderProps {
  titre: string;
}

const Header = ({ titre }: HeaderProps) => {
  const navigate = useNavigate();
  const [dateTime, setDateTime] = useState<string>("");

  // 🕒 Met à jour la date et l’heure en temps réel
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleString("fr-FR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setDateTime(formatted.replace(",", " •"));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔐 Utilisateur connecté
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

  // 🧭 Navigation
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
    <div className="relative bg-gradient-to-r from-[#1976d2] to-[#1565c0] text-white px-6 py-2.5 shadow-2xl font-serif">
      {/* Accent haut */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-blue-300 to-yellow-400"></div>

      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        {/* Logo + titre */}
        <div
          className="flex items-center space-x-3 cursor-pointer hover:scale-105 transition-transform duration-200"
          onClick={handlehome}
        >
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
            <FaCapsules className="text-3xl text-yellow-300" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold tracking-tight">
              PharmaPro
            </span>
            <span className="text-xs opacity-90">
              Pharmacie El Abawain • {titre}
            </span>
          </div>
        </div>

        {/* Menu central */}
        <div className="flex space-x-2 text-sm font-medium">
          <button
            className="hover:bg-white/15 transition-all duration-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg backdrop-blur-sm"
            onClick={handleStock}
          >
            <FaBox className="text-base" /> Stock
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg backdrop-blur-sm"
            onClick={handlecredit}
          >
            <FaMoneyBillWave className="text-base" /> Crédit
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg backdrop-blur-sm"
            onClick={handleVentes}
          >
            <FaClipboardList className="text-base" /> Inventaire
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg backdrop-blur-sm"
            onClick={handleStatisiques}
          >
            <FaChartBar className="text-base" /> Stats
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg backdrop-blur-sm"
            onClick={handleAjoutProduit}
          >
            <FaPlus className="text-base" /> Produit
          </button>
          <button
            className="hover:bg-white/15 transition-all duration-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg backdrop-blur-sm"
            onClick={handleCommandes}
          >
            <FaTruck className="text-base" /> Commandes
          </button>
        </div>

        {/* Utilisateur + réglages + heure */}
        <div className="flex items-center space-x-4">
          {/* Date/Heure affichage */}
          <div className="text-xs text-yellow-200 italic font-medium select-none bg-white/10 px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-sm">
            {dateTime}
          </div>

          <button
            className="hover:bg-white/15 transition-all duration-200 p-2 rounded-lg hover:shadow-lg backdrop-blur-sm"
            onClick={handleSetting}
            title="Réglages"
          >
            <FaCog className="text-xl" />
          </button>

          <button
            className="hover:bg-red-500/80 transition-all duration-200 p-2 rounded-lg hover:shadow-lg backdrop-blur-sm"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <FaSignOutAlt className="text-xl" />
          </button>

          {/* Badge utilisateur */}
          <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center font-bold text-[#1976d2] text-sm shadow-md">
              {getInitials(utilisateur)}
            </div>
            <span className="text-sm font-semibold">Dr. {utilisateur}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
