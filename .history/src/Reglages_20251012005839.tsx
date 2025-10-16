import { useState } from "react";
import Header from "./header";

interface User {
  username: string;
  password: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([
    { username: "admin", password: "admin123" },
  ]);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  // Add new user with validation
  const handleAddUser = () => {
    setError("");

    if (!newUsername.trim() || !newPassword.trim()) {
      setError("Tous les champs sont obligatoires");
      return;
    }

    // Check if username already exists
    if (users.some((user) => user.username === newUsername)) {
      setError("Ce nom d'utilisateur existe déjà");
      return;
    }

    setUsers([
      ...users,
      { username: newUsername.trim(), password: newPassword },
    ]);
    setNewUsername("");
    setNewPassword("");
  };

  // Delete user
  const handleDeleteUser = (index: number) => {
    if (users.length === 1) {
      setError("Vous ne pouvez pas supprimer le dernier utilisateur");
      return;
    }
    const updatedUsers = users.filter((_, i) => i !== index);
    setUsers(updatedUsers);
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
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">
            Liste des utilisateurs ({users.length})
          </h2>
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
                {users.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3">
                      {user.username}
                    </td>
                    <td className="border border-gray-300 p-3">
                      {"•".repeat(user.password.length)}
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      <button
                        onClick={() => handleDeleteUser(index)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="max-w-2xl mx-auto mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Note:</strong> Les utilisateurs ajoutés seront perdus
            après actualisation de la page. Pour une solution permanente,
            connectez cette interface à une base de données.
          </p>
        </div>
      </div>
    </div>
  );
}
