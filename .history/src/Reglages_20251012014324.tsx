import { useEffect, useState } from "react";
import Header from "./header";

interface User {
  id: number;
  nomUtilisateur: string;
  motDePasse: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Visibility states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(
    new Set()
  );

  const API_URL = "http://localhost:7194/api/utilisateurs"; // Change if needed

  // Fetch users from the backend
  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Erreur serveur");
        return res.json();
      })
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur lors du chargement des utilisateurs");
        setLoading(false);
      });
  }, []);

  // Add new user
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
      }),
    })
      .then((res) => {
        if (res.status === 409)
          throw new Error("Ce nom d'utilisateur existe déjà");
        if (!res.ok) throw new Error("Erreur lors de l'ajout");
        return res.json();
      })
      .then((newUser: User) => {
        setUsers((prev) => [...prev, newUser]);
        setNewUsername("");
        setNewPassword("");
        setShowNewPassword(false);
      })
      .catch((err) => setError(err.message));
  };

  // Delete user
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
        setUsers((prev) => prev.filter((user) => user.id !== id));
        // also remove from visible set if present
        setVisiblePasswords((prev) => {
          const copy = new Set(prev);
          copy.delete(id);
          return copy;
        });
      })
      .catch(() => setError("Impossible de supprimer l'utilisateur"));
  };

  // Toggle visibility for a specific user password
  const toggleUserPasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  // Toggle new password visibility
  const toggleNewPasswordVisibility = () => {
    setShowNewPassword((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header utilisateur="RABAB Sabri" titre="Réglages" />

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

            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-24"
                aria-label="Mot de passe"
              />
              <button
                type="button"
                onClick={toggleNewPasswordVisibility}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent px-3 py-1 rounded text-sm border border-gray-200 hover:bg-gray-50"
                aria-pressed={showNewPassword}
              >
                {showNewPassword ? "Masquer" : "Afficher"}
              </button>
            </div>

            <button
              onClick={handleAddUser}
              className="bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-2xl mx-auto">
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

                        <td className="border border-gray-300 p-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="break-words">
                              {isVisible
                                ? user.motDePasse
                                : "•".repeat(
                                    Math.max(4, user.motDePasse.length)
                                  )}
                            </span>

                            <div className="ml-4 flex items-center gap-2">
                              <button
                                onClick={() =>
                                  toggleUserPasswordVisibility(user.id)
                                }
                                className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
                                aria-pressed={isVisible}
                                title={
                                  isVisible
                                    ? "Masquer le mot de passe"
                                    : "Afficher le mot de passe"
                                }
                              >
                                {isVisible ? "Masquer" : "Afficher"}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="border border-gray-300 p-3 text-center">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
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

        {/* Warning */}
        <div className="max-w-2xl mx-auto mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Note :</strong> Les utilisateurs sont maintenant
            enregistrés dans une base de données. Assurez-vous que le serveur
            backend est en cours d'exécution.
          </p>
        </div>
      </div>
    </div>
  );
}
