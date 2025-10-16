import { useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderLogic from "./Headerlogin";

export default function LogicPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const API_URL = "http://localhost:7194/api/utilisateurs";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Erreur de connexion au serveur");
      const users = await res.json();

      const foundUser = users.find(
        (u: any) =>
          u.nomUtilisateur === username.trim() && u.motDePasse === password
      );

      if (foundUser) {
        // ✅ Save connected user in localStorage
        localStorage.setItem("connectedUser", foundUser.nomUtilisateur);

        // ✅ Redirect
        navigate("/pharma");
      } else {
        setError("Nom d'utilisateur ou mot de passe incorrect");
      }
    } catch (err) {
      setError("Erreur lors de la connexion");
    }
  };

  return (
    <div className="h-screen bg-gray-100 p-4 flex flex-col items-center gap-10">
      <HeaderLogic />

      <div className="bg-white p-8 rounded-2xl shadow-md w-80">
        <h2 className="text-2xl font-bold mb-6 text-center">Connexion</h2>
        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-3 text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nom utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
