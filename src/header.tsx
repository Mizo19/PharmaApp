import { FaCapsules } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBox,
  FaMoneyBillWave,
  FaClipboardList,
  FaChartBar,
  FaPlus,
  FaTruck,
  FaSignOutAlt,
  FaCog,
  FaBell,
  FaHourglassHalf,
} from "react-icons/fa";
import { useEffect, useState } from "react";
import axios from "axios";

interface HeaderProps {
  titre: string;
}

const navItems = [
  { label: "Stock", icon: FaBox, path: "/Stock" },
  { label: "Crédit", icon: FaMoneyBillWave, path: "/Credit" },
  { label: "Ventes", icon: FaClipboardList, path: "/Venteshistorique" },
  { label: "Stats", icon: FaChartBar, path: "/Statistiques" },
  { label: "Produit", icon: FaPlus, path: "/ajout-produit" },
  { label: "Commandes", icon: FaTruck, path: "/Commandes" },
  { label: "Péremption", icon: FaHourglassHalf, path: "/ProchesPerimes" },
];

const Header = ({ titre }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dateTime, setDateTime] = useState<string>("");
  const [pricePending, setPricePending] = useState(0);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleString("fr-FR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      setDateTime(formatted.replace(",", " •"));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pending price updates (scraped vs DB)
  useEffect(() => {
    axios
      .get("http://localhost:7194/api/pricing/diff")
      .then((r) => {
        const s = r.data?.summary;
        if (s) setPricePending(Number(s.changed || 0) + Number(s.new || 0));
      })
      .catch(() => setPricePending(0));
  }, []);

  const rawUser = localStorage.getItem("connectedUser");
  let utilisateur = "Utilisateur";

  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      utilisateur =
        parsed.nomUtilisateur ||
        parsed.NomUtilisateur ||
        parsed.nom ||
        parsed.username ||
        rawUser ||
        "Utilisateur";
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-12deg); }
          75% { transform: rotate(12deg); }
        }
      `}</style>
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-sm">
      <div className="flex items-center justify-between px-6 h-16 max-w-[1600px] mx-auto">
        {/* Logo + titre */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate("/pharma")}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
            <FaCapsules className="text-white text-lg" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold text-slate-900 tracking-tight">
              PharmaPro
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {titre}
            </span>
          </div>
        </div>

        {/* Menu central */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ label, icon: Icon, path }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`relative px-3 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-all ${
                  active
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="text-sm" />
                <span>{label}</span>
                {active && (
                  <span className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Droite : date + actions + user */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:block text-[11px] text-slate-500 font-medium px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60 tabular-nums">
            {dateTime}
          </div>

          <button
            onClick={() => navigate("/MiseAJourPrix")}
            title={
              pricePending > 0
                ? `${pricePending.toLocaleString()} mise(s) à jour de prix disponible(s)`
                : "Aucune mise à jour en attente"
            }
            className={`relative p-2 rounded-lg transition-colors ${
              pricePending > 0
                ? "text-emerald-600 hover:bg-emerald-50"
                : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FaBell className={`text-sm ${pricePending > 0 ? "animate-[wiggle_1.2s_ease-in-out_infinite]" : ""}`} />
            {pricePending > 0 && (
              <>
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-sm tabular-nums">
                  {pricePending > 99 ? "99+" : pricePending}
                </span>
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-rose-500 rounded-full opacity-60 animate-ping" />
              </>
            )}
          </button>

          <button
            onClick={() => navigate("/Reglages")}
            title="Réglages"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <FaCog className="text-sm" />
          </button>

          <button
            onClick={() => navigate("/")}
            title="Déconnexion"
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <FaSignOutAlt className="text-sm" />
          </button>

          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-[11px] font-semibold shadow-sm">
              {getInitials(utilisateur)}
            </div>
            <span className="hidden sm:block text-[13px] font-medium text-slate-700 max-w-[140px] truncate">
              {utilisateur}
            </span>
          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default Header;
