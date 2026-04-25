import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaLock, FaUser } from "react-icons/fa";
import HeaderLogic from "./Headerlogin";

export default function LogicPage() {
  const [selectedUser, setSelectedUser] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = "http://localhost:7194/api/utilisateurs";

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
        setError("Code d'accès incorrect");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-green-50">
      <HeaderLogic />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md border border-green-100">
          <div className="p-8">
            {/* Croix verte de pharmacie */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center shadow-sm">
                <FaPlus className="text-white text-3xl" />
              </div>
            </div>

            <h1 className="text-center text-2xl font-bold text-gray-800 mb-1">
              Connexion
            </h1>
            <p className="text-center text-sm text-gray-500 mb-7">
              Accédez à votre espace pharmacie
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Utilisateur
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-gray-400 text-sm" />
                  </div>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Sélectionnez un utilisateur</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.nomUtilisateur}>
                        {u.nomUtilisateur}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400 text-sm" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all outline-none placeholder:text-gray-400"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              © 2025 Pharmacie El Abawain
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
