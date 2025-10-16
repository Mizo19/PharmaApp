import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCapsules, FaLock, FaArrowRight } from "react-icons/fa";
import HeaderLogic from "./Headerlogin";

export default function LogicPage() {
  const [selectedUser, setSelectedUser] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = "http://localhost:7194/api/utilisateurs";

  // Charger les utilisateurs depuis l’API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Erreur serveur");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError("Impossible de charger la liste des utilisateurs");
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = users.find(
        (u) =>
          u.nomUtilisateur === selectedUser && u.motDePasse === password.trim()
      );

      if (user) {
        localStorage.setItem("connectedUser", user.nomUtilisateur);
        localStorage.setItem("isAdmin", user.isAdmin ? "true" : "false");
        navigate("/pharma");
      } else {
        setError("Mot de passe incorrect");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex flex-col relative overflow-hidden">
      {/* Cercles décoratifs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>

      {/* Header */}
      <div className="relative z-10">
        <HeaderLogic />
      </div>

      {/* Carte de connexion */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
          {/* Logo & Titre */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
              <FaCapsules className="text-4xl text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
              PharmaPro
            </h1>
            <p className="text-gray-500 text-sm">
              Pharmacie El Abawain - Connexion
            </p>
          </div>

          {/* Message d’erreur */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Liste déroulante utilisateur */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Utilisateur
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none bg-white"
              >
                <option value="">-- Sélectionnez un utilisateur --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.nomUtilisateur}>
                    {u.nomUtilisateur}
                  </option>
                ))}
              </select>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Code d’accès
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transform hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <FaArrowRight className="text-lg" />
                </>
              )}
            </button>
          </form>

          {/* Pied de page */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              © 2025 PharmaPro - Tous droits réservés
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
