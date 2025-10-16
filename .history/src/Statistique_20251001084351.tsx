// Statistique.tsx
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Header from "./header";

interface Sale {
  date: string;
  medicines: string;
  totalArticles: number;
  totalPrice: number;
  typeDeVente: string;
  numeroDeVente: string;
  nomClient: string;
  responsable_Vente: string;
  quantité_Restante: number;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const Statistique: React.FC = () => {
  const [data, setData] = useState<Sale[]>([]);

  useEffect(() => {
    fetch("http://localhost:7194/api/sales")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err));
  }, []);

  // --- 1. Top 5 médicaments du mois ---
  const topMedicaments = (() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const map: Record<string, number> = {};
    data.forEach((sale) => {
      const d = new Date(sale.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        map[sale.medicines] = (map[sale.medicines] || 0) + sale.totalArticles;
      }
    });

    return Object.entries(map)
      .map(([med, total]) => ({ name: med, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  })();

  // --- 2. Évolution mensuelle (CA) ---
  const evolutionMensuelle = (() => {
    const map: Record<string, number> = {};
    data.forEach((sale) => {
      const d = new Date(sale.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      map[key] = (map[key] || 0) + sale.totalPrice;
    });

    return Object.entries(map)
      .map(([mois, total]) => ({ mois, total }))
      .sort((a, b) => a.mois.localeCompare(b.mois));
  })();

  // --- 3. Médicaments vendus > 5 cette semaine ---
  const medicamentsSemaine = (() => {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);

    const map: Record<string, number> = {};
    data.forEach((sale) => {
      const d = new Date(sale.date);
      if (d >= weekAgo) {
        map[sale.medicines] = (map[sale.medicines] || 0) + sale.totalArticles;
      }
    });

    return Object.entries(map)
      .filter(([_, total]) => total > 5)
      .map(([med, total]) => ({ name: med, total }));
  })();

  // --- 4. Répartition par type de vente ---
  const typeDeVenteData = (() => {
    const map: Record<string, number> = {};
    data.forEach((sale) => {
      map[sale.typeDeVente] = (map[sale.typeDeVente] || 0) + sale.totalPrice;
    });
    return Object.entries(map).map(([type, value]) => ({ name: type, value }));
  })();

  // --- 5. Top responsables de vente ---
  const responsableData = (() => {
    const map: Record<string, number> = {};
    data.forEach((sale) => {
      const resp = sale.responsable_Vente || "Inconnu";
      map[resp] = (map[resp] || 0) + sale.totalPrice;
    });
    return Object.entries(map).map(([responsable, total]) => ({
      responsable,
      total,
    }));
  })();

  // --- 6. Récapitulatif ---
  const recap = (() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);

    const totalDay = data
      .filter((s) => s.date.startsWith(today))
      .reduce((a, s) => a + s.totalPrice, 0);

    const totalWeek = data
      .filter((s) => new Date(s.date) >= weekAgo)
      .reduce((a, s) => a + s.totalPrice, 0);

    const totalMonth = data
      .filter(
        (s) =>
          new Date(s.date).getMonth() === now.getMonth() &&
          new Date(s.date).getFullYear() === now.getFullYear()
      )
      .reduce((a, s) => a + s.totalPrice, 0);

    return { totalDay, totalWeek, totalMonth };
  })();

  return (
    <div>
      <Header utilisateur="RABAB SABRI" titre="Statistique" />

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- Top 5 Médicaments --- */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-bold mb-2">Top 5 médicaments du mois</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topMedicaments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* --- Répartition par type de vente --- */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-bold mb-2">
            Répartition par type de vente
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeDeVenteData} dataKey="value" outerRadius={80}>
                {typeDeVenteData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                formatter={(value, entry: any) => {
                  const total = typeDeVenteData.reduce(
                    (a, b) => a + b.value,
                    0
                  );
                  const percent = entry?.payload
                    ? ((entry.payload.value / total) * 100).toFixed(1)
                    : "0.0";
                  return `${value} (${percent}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* --- Évolution mensuelle --- */}
        <div className="bg-white rounded-2xl shadow p-4 md:col-span-2">
          <h2 className="text-lg font-bold mb-2">
            Évolution des ventes mensuelles
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={evolutionMensuelle}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#10B981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* --- Top responsables --- */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-bold mb-2">Top responsables de vente</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={responsableData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="responsable" type="category" />
              <Tooltip />
              <Bar dataKey="total" fill="#10B981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* --- Récap --- */}
        <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-center">
          <h2 className="text-lg font-bold mb-4">Récap ventes</h2>
          <p>
            Aujourd’hui :{" "}
            <span className="font-semibold">
              {recap.totalDay.toFixed(2)} MAD
            </span>
          </p>
          <p>
            Cette semaine :{" "}
            <span className="font-semibold">
              {recap.totalWeek.toFixed(2)} MAD
            </span>
          </p>
          <p>
            Ce mois :{" "}
            <span className="font-semibold">
              {recap.totalMonth.toFixed(2)} MAD
            </span>
          </p>
        </div>

        {/* --- Médicaments de la semaine --- */}
        <div className="bg-white rounded-2xl shadow p-4 md:col-span-2">
          <h2 className="text-lg font-bold mb-2">
            Médicaments vendus &gt; 5 unités cette semaine
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={medicamentsSemaine}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#F59E0B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Statistique;
