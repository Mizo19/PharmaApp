import { useState } from "react";

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

  // Add new user
  const handleAddUser = () => {
    if (!newUsername || !newPassword) return;
    setUsers([...users, { username: newUsername, password: newPassword }]);
    setNewUsername("");
    setNewPassword("");
  };

  // Delete user
  const handleDeleteUser = (index: number) => {
    const updatedUsers = users.filter((_, i) => i !== index);
    setUsers(updatedUsers);
  };

  return (
    <div className="h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Réglages Utilisateurs
      </h1>

      {/* Add User Form */}
      <div className="bg-white p-6 rounded-2xl shadow-md max-w-md mx-auto mb-8">
        <h2 className="text-xl font-semibold mb-4">Ajouter un utilisateur</h2>
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
      <div className="bg-white p-6 rounded-2xl shadow-md max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Liste des utilisateurs</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border p-2 text-left">Nom utilisateur</th>
              <th className="border p-2 text-left">Mot de passe</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={index}>
                <td className="border p-2">{user.username}</td>
                <td className="border p-2">{user.password}</td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => handleDeleteUser(index)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition"
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
  );
}
