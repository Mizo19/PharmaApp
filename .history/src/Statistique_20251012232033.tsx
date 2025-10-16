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

  const typeDeVenteData = (() => {
    const map: Record<string, number> = {};
    data.forEach((sale) => {
      map[sale.typeDeVente] = (map[sale.typeDeVente] || 0) + sale.totalPrice;
    });
    return Object.entries(map).map(([type, value]) => ({ name: type, value }));
  })();

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
    <div className="min-h-screen bg-gray-50 bg-gradient-to-br from-emerald-50 to-emerald-100">
      <Header titre="Statistique" />

      <div className="p-4 grid grid-cols-3 gap-4 max-w-7xl mx-auto">
        {/* Top 5 */}
        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-bold mb-2">Top 5 médicaments du mois</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topMedicaments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Type vente */}
        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-bold mb-2">Répartition ventes</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={typeDeVenteData} dataKey="value" outerRadius={60}>
                {typeDeVenteData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recap */}
        <div className="bg-white rounded-lg shadow p-3 flex flex-col justify-center">
          <h2 className="text-sm font-bold mb-3">Récap ventes</h2>
          <p className="text-xs mb-1">
            Aujourd'hui:{" "}
            <span className="font-semibold">
              {recap.totalDay.toFixed(2)} MAD
            </span>
          </p>
          <p className="text-xs mb-1">
            Semaine:{" "}
            <span className="font-semibold">
              {recap.totalWeek.toFixed(2)} MAD
            </span>
          </p>
          <p className="text-xs">
            Mois:{" "}
            <span className="font-semibold">
              {recap.totalMonth.toFixed(2)} MAD
            </span>
          </p>
        </div>

        {/* Evolution */}
        <div className="bg-white rounded-lg shadow p-3 col-span-2">
          <h2 className="text-sm font-bold mb-2">Évolution mensuelle</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={evolutionMensuelle}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
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

        {/* Responsables */}
        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-bold mb-2">Top responsables</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={responsableData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="responsable"
                type="category"
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Semaine */}
        <div className="bg-white rounded-lg shadow p-3 col-span-3">
          <h2 className="text-sm font-bold mb-2">
            Médicaments &gt; 5 unités cette semaine
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={medicamentsSemaine}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Statistique;
