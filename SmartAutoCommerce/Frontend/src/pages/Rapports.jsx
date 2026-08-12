import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DJANGO_API } from "../config/apiConfig";
import { Download, CalendarDays, DollarSign, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  formatOrderDate,
  getOrdersForRevenueChart,
  getPaidOrders,
  localDateKeyToLabel,
  parseOrderAmount,
  toLocalDateKey,
} from "../utils/orderUtils";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const PERIODS = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
  { label: "90 jours", value: 90 },
];

const Rapports = () => {
  const { user } = useAuth();
  const { currentSymbol } = useSettings();
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const res = await axios.get(`${DJANGO_API}/commandes/`);
        const userOrders = (res.data || []).filter((item) => item.id_utilisateur === user.id);
        setOrders(userOrders);
      } catch (error) {
        console.error("Erreur chargement rapports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user?.id]);

  const filteredOrders = useMemo(() => {
    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);
    minDate.setDate(minDate.getDate() - (days - 1));
    return orders.filter((o) => {
      const key = toLocalDateKey(o.created_at);
      if (!key) return false;
      const [y, m, d] = key.split("-").map(Number);
      const orderDate = new Date(y, m - 1, d);
      return orderDate >= minDate;
    });
  }, [orders, days]);

  const paidFilteredOrders = useMemo(() => getPaidOrders(filteredOrders), [filteredOrders]);

  const kpis = useMemo(() => {
    const totalRevenue = paidFilteredOrders.reduce((sum, order) => sum + parseOrderAmount(order.montant_total), 0);
    const totalOrders = filteredOrders.length;
    const paidOrders = filteredOrders.filter((o) => (o.statut_paiement || "").toLowerCase() === "paye").length;
    const deliveredOrders = filteredOrders.filter((o) => (o.statut_livraison || "").toLowerCase() === "livre").length;
    return {
      totalRevenue,
      totalOrders,
      paymentRate: totalOrders ? Math.round((paidOrders / totalOrders) * 100) : 0,
      deliveryRate: totalOrders ? Math.round((deliveredOrders / totalOrders) * 100) : 0,
    };
  }, [filteredOrders, paidFilteredOrders]);

  const chartTextColor = darkMode ? "#d1d5db" : "#4b5563";
  const gridColor = darkMode ? "rgba(75,85,99,0.35)" : "rgba(203,213,225,0.75)";
  const commonOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: chartTextColor, font: { size: 11, weight: 600 } },
        },
      },
      scales: {
        x: { ticks: { color: chartTextColor }, grid: { color: gridColor } },
        y: { ticks: { color: chartTextColor }, grid: { color: gridColor } },
      },
    }),
    [chartTextColor, gridColor]
  );

  const revenueTrendData = useMemo(() => {
    const map = new Map();
    const now = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = toLocalDateKey(d);
      map.set(key, 0);
    }
    getPaidOrders(getOrdersForRevenueChart(filteredOrders)).forEach((o) => {
      const key = toLocalDateKey(o.created_at);
      if (!key || !map.has(key)) return;
      map.set(key, (map.get(key) || 0) + parseOrderAmount(o.montant_total));
    });
    return {
      labels: Array.from(map.keys()).map((k) => localDateKeyToLabel(k)),
      datasets: [
        {
          label: `CA (${currentSymbol})`,
          data: Array.from(map.values()),
          borderColor: "#06b6d4",
          backgroundColor: "rgba(6, 182, 212, 0.2)",
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  }, [days, filteredOrders, currentSymbol]);

  const deliveryBarData = useMemo(() => {
    const statusMap = { livre: 0, en_cours: 0, en_attente: 0, annule: 0 };
    filteredOrders.forEach((o) => {
      const key = (o.statut_livraison || "en_attente").toLowerCase();
      if (statusMap[key] !== undefined) statusMap[key] += 1;
      else statusMap.en_attente += 1;
    });
    return {
      labels: ["Livre", "En cours", "En attente", "Annule"],
      datasets: [
        {
          label: "Livraisons",
          data: [statusMap.livre, statusMap.en_cours, statusMap.en_attente, statusMap.annule],
          backgroundColor: ["#22c55e", "#f59e0b", "#94a3b8", "#ef4444"],
          borderRadius: 8,
        },
      ],
    };
  }, [filteredOrders]);

  const paymentDonutData = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    filteredOrders.forEach((o) => {
      if ((o.statut_paiement || "").toLowerCase() === "paye") paid += 1;
      else unpaid += 1;
    });
    return {
      labels: ["Paye", "Non paye"],
      datasets: [{ data: [paid, unpaid], backgroundColor: ["#16a34a", "#fb7185"], borderWidth: 0 }],
    };
  }, [filteredOrders]);

  const exportCsv = () => {
    const rows = [
      ["id", "date", "montant_total", "statut_paiement", "statut_livraison"],
      ...filteredOrders.map((o) => [
        o.id,
        o.created_at ? new Date(o.created_at).toISOString() : "",
        o.montant_total ?? "",
        o.statut_paiement ?? "",
        o.statut_livraison ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-commandes-${days}j.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white">Rapports</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vue analytique de la performance commerciale.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
              <CalendarDays size={16} className="text-cyan-500" />
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500 text-white text-sm font-bold hover:bg-cyan-600 transition-colors"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Chiffre d'affaires" value={`${kpis.totalRevenue.toLocaleString()} ${currentSymbol}`} icon={DollarSign} />
          <KpiCard label="Commandes" value={kpis.totalOrders} icon={ShoppingCart} />
          <KpiCard label="Taux de paiement" value={`${kpis.paymentRate}%`} icon={CheckCircle2} />
          <KpiCard label="Taux de livraison" value={`${kpis.deliveryRate}%`} icon={CheckCircle2} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <ChartCard title={`CA sur ${days} jours`} subtitle="Tendance journaliere">
            <Line data={revenueTrendData} options={commonOptions} />
          </ChartCard>
          <ChartCard title="Statut de paiement" subtitle="Repartition paye / non paye">
            <Doughnut data={paymentDonutData} options={{ ...commonOptions, scales: undefined }} />
          </ChartCard>
        </div>

        <ChartCard title="Statut de livraison" subtitle="Distribution operationnelle">
          <Bar
            data={deliveryBarData}
            options={{
              ...commonOptions,
              plugins: { ...commonOptions.plugins, legend: { display: false } },
            }}
          />
        </ChartCard>
      </div>
    </div>
  );
};

const KpiCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white/90 dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-lg">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">{label}</p>
      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
        <Icon size={16} />
      </div>
    </div>
    <p className="text-xl font-black text-gray-900 dark:text-white">{value}</p>
  </div>
);

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white/90 dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-lg">
    <div className="mb-4">
      <h2 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
    <div className="h-72">{children}</div>
  </div>
);

export default Rapports;
