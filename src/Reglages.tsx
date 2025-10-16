import { useEffect, useState } from "react";
import Header from "./header";
import { FaEye, FaEyeSlash, FaCrown } from "react-icons/fa"; // 👑 ajout de l’icône admin

interface User {
  id: number;
  nomUtilisateur: string;
  motDePasse: string;
  isAdmin: boolean;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(
    new Set()
  );

  const API_URL = "http://localhost:7194/api/utilisateurs";

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur lors du chargement des utilisateurs");
        setLoading(false);
      });
  }, []);

  const handleAddUser = () => {
    setError("");

    if (!newUsername.trim() || !newPassword.trim()) {
      setError("Tous les champs sont obligatoires");
      return;
    }

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomUtilisateur: newUsername.trim(),
        motDePasse: newPassword,
        isAdmin: false, // 👈 par défaut utilisateur normal
      }),
    })
      .then((res) => {
        if (res.status === 409)
          throw new Error("Ce nom d'utilisateur existe déjà");
        if (!res.ok) throw new Error("Erreur lors de l'ajout");
        return res.json();
      })
      .then((newUser) => {
        setUsers([...users, newUser]);
        setNewUsername("");
        setNewPassword("");
      })
      .catch((err) => setError(err.message));
  };

  const handleDeleteUser = (id: number) => {
    setError("");

    if (users.length === 1) {
      setError("Vous ne pouvez pas supprimer le dernier utilisateur");
      return;
    }

    fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur lors de la suppression");
        setUsers(users.filter((user) => user.id !== id));
      })
      .catch(() => setError("Impossible de supprimer l'utilisateur"));
  };

  // ✅ Active/désactive admin
  const toggleAdmin = (user: User) => {
    const updatedUser = { ...user, isAdmin: !user.isAdmin };

    fetch(`${API_URL}/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedUser),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur lors de la mise à jour");
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? updatedUser : u))
        );
      })
      .catch(() => setError("Impossible de mettre à jour le rôle"));
  };

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 bg-gradient-to-br from-emerald-50 to-emerald-100">
      <Header titre="Réglages" />

      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Réglages Utilisateurs
        </h1>

        {/* Add User Form */}
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-md mx-auto mb-8">
          <h2 className="text-xl font-semibold mb-4">Ajouter un utilisateur</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nom utilisateur"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddUser}
              className="bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">
            Liste des utilisateurs ({users.length})
          </h2>

          {loading ? (
            <p className="text-gray-500">Chargement...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Nom utilisateur
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Mot de passe
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      Rôle
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isVisible = visiblePasswords.has(user.id);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3">
                          {user.nomUtilisateur}
                        </td>
                        <td className="border border-gray-300 p-3 flex items-center justify-between">
                          <span>
                            {isVisible
                              ? user.motDePasse
                              : "•".repeat(user.motDePasse.length)}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="ml-2 text-gray-500 hover:text-gray-700"
                          >
                            {isVisible ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          <span
                            className={`${
                              user.isAdmin
                                ? "text-blue-600 font-semibold"
                                : "text-gray-500"
                            } flex items-center justify-center gap-1`}
                          >
                            {user.isAdmin && <FaCrown />}
                            {user.isAdmin ? "Admin" : "Utilisateur"}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-3 text-center flex justify-center gap-2">
                          <button
                            onClick={() => toggleAdmin(user)}
                            className={`px-3 py-2 rounded-lg text-white transition ${
                              user.isAdmin
                                ? "bg-gray-500 hover:bg-gray-600"
                                : "bg-blue-500 hover:bg-blue-600"
                            }`}
                          >
                            {user.isAdmin
                              ? "Désactiver Admin"
                              : "Activer Admin"}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Note :</strong> Les utilisateurs et leurs rôles (admin ou
            non) sont stockés dans la base de données. Assurez-vous que le
            serveur backend fonctionne.
          </p>
        </div>
      </div>
    </div>
  );
}
