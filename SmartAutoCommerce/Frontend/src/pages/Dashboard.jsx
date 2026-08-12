import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { DJANGO_API } from '../config/apiConfig';
import {
    formatOrderDate,
    formatPaymentStatus,
    getOrderReference,
    getOrdersForRevenueChart,
    getPaidOrders,
    isOrderPaid,
    localDateKeyToLabel,
    parseOrderAmount,
    toLocalDateKey,
} from '../utils/orderUtils';
import {
    Users,
    ShoppingCart,
    DollarSign,
    Package,
    TrendingUp,
    Clock,
    CheckCircle2,
    Truck
} from 'lucide-react';
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
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

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

const Dashboard = () => {
    const { user } = useAuth();
    const { currentSymbol } = useSettings();
    const { darkMode } = useTheme();
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        totalClients: 0,
        totalProducts: 0,
    });
    const [orders, setOrders] = useState([]);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);

    const [recentOrders, setRecentOrders] = useState([]);
    const [topClients, setTopClients] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.id) return;

            try {
                setLoading(true);

                // 1. Fetch Orders
                const ordersRes = await axios.get(`${DJANGO_API}/commandes/`);
                const userOrders = ordersRes.data?.filter(item => item.id_utilisateur === user.id) || [];
                const paidOrders = getPaidOrders(userOrders);

                const revenue = paidOrders.reduce((sum, order) => sum + parseOrderAmount(order.montant_total), 0);

                // 2. Fetch Clients
                const clientsRes = await axios.get(`${DJANGO_API}/client/?user_id=${user.id}`);
                // if API doesn't filter perfectly, fallback filter :
                const userClients = clientsRes.data?.filter(item => item.id_utilisateur === user.id) || [];

                // 3. Fetch Products
                const productsRes = await axios.get(`${DJANGO_API}/data/`);
                const userProducts = productsRes.data?.filter(item => item.id_utilisateur === user.id) || [];
                setOrders(userOrders);
                setClients(userClients);
                setProducts(userProducts);

                setStats({
                    totalRevenue: revenue,
                    totalOrders: userOrders.length,
                    totalClients: userClients.length,
                    totalProducts: userProducts.length,
                });

                // Set recent 5 orders
                setRecentOrders(
                    userOrders
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .slice(0, 5)
                );

                const detailsResponses = await Promise.all(
                    userOrders.map((order) =>
                        axios.get(`${DJANGO_API}/commandes/${order.id}/`).catch(() => ({ data: [] }))
                    )
                );

                const productSalesMap = {};
                detailsResponses.forEach((res) => {
                    (res.data || []).forEach((detail) => {
                        const productName = detail.products?.name || 'Produit inconnu';
                        const qty = Number(detail.quantite_acheter || 0);
                        productSalesMap[productName] = (productSalesMap[productName] || 0) + qty;
                    });
                });
                setTopProducts(
                    Object.entries(productSalesMap)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                );

                const paidUserOrders = getPaidOrders(userOrders);

                const clientStatsMap = {};
                paidUserOrders.forEach((order) => {
                    const clientKey = order.id_client || order.nom || 'inconnu';
                    if (!clientStatsMap[clientKey]) {
                        const matchedClient = userClients.find((c) => c.res_id === order.id_client);
                        clientStatsMap[clientKey] = {
                            id: clientKey,
                            nom: order.nom || matchedClient?.nom || 'Client inconnu',
                            email: matchedClient?.email,
                            telephone: order.telephone || matchedClient?.telephone,
                            adresse: order.adresse || matchedClient?.adresse,
                            totalSpent: 0,
                            orderCount: 0,
                        };
                    }
                    clientStatsMap[clientKey].totalSpent += parseOrderAmount(order.montant_total);
                    clientStatsMap[clientKey].orderCount += 1;
                });
                setTopClients(
                    Object.values(clientStatsMap)
                        .sort((a, b) => b.totalSpent - a.totalSpent || b.orderCount - a.orderCount)
                        .slice(0, 5)
                );

            } catch (error) {
                console.error("Erreur lors de la récupération des données du tableau de bord:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user?.id]);

    const baseTextColor = darkMode ? '#d1d5db' : '#4b5563';
    const gridColor = darkMode ? 'rgba(75, 85, 99, 0.35)' : 'rgba(203, 213, 225, 0.7)';

    const commonChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: baseTextColor,
                    font: { size: 11, weight: 600 },
                },
            },
            tooltip: {
                backgroundColor: darkMode ? '#111827' : '#ffffff',
                titleColor: darkMode ? '#f3f4f6' : '#111827',
                bodyColor: darkMode ? '#d1d5db' : '#374151',
                borderColor: darkMode ? '#374151' : '#e5e7eb',
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                ticks: { color: baseTextColor },
                grid: { color: gridColor },
            },
            y: {
                ticks: { color: baseTextColor },
                grid: { color: gridColor },
            },
        },
    }), [baseTextColor, darkMode, gridColor]);

    const revenueByDay = useMemo(() => {
        const dayMap = new Map();
        const now = new Date();
        for (let i = 29; i >= 0; i -= 1) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const key = toLocalDateKey(d);
            dayMap.set(key, 0);
        }
        getPaidOrders(getOrdersForRevenueChart(orders)).forEach((order) => {
            const key = toLocalDateKey(order.created_at);
            if (!key || !dayMap.has(key)) return;
            const amount = parseOrderAmount(order.montant_total);
            dayMap.set(key, (dayMap.get(key) || 0) + amount);
        });
        const labels = Array.from(dayMap.keys()).map((key) => localDateKeyToLabel(key));
        return {
            labels,
            datasets: [
                {
                    label: `CA (${currentSymbol})`,
                    data: Array.from(dayMap.values()),
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                },
            ],
        };
    }, [orders, currentSymbol]);

    const deliveryStatusData = useMemo(() => {
        const statusMap = { livre: 0, en_cours: 0, en_attente: 0, annule: 0 };
        orders.forEach((order) => {
            const key = (order.statut_livraison || 'en_attente').toLowerCase();
            if (statusMap[key] !== undefined) {
                statusMap[key] += 1;
            } else {
                statusMap.en_attente += 1;
            }
        });
        return {
            labels: ['Livré', 'En cours', 'En attente', 'Annulé'],
            datasets: [{
                label: 'Commandes',
                data: [statusMap.livre, statusMap.en_cours, statusMap.en_attente, statusMap.annule],
                backgroundColor: ['#10b981', '#f59e0b', '#94a3b8', '#ef4444'],
                borderRadius: 8,
            }],
        };
    }, [orders]);

    const paymentStatusData = useMemo(() => {
        let paid = 0;
        let unpaid = 0;
        orders.forEach((order) => {
            if ((order.statut_paiement || '').toLowerCase() === 'paye') paid += 1;
            else unpaid += 1;
        });
        return {
            labels: ['Payé', 'Non payé'],
            datasets: [{
                data: [paid, unpaid],
                backgroundColor: ['#22c55e', '#fb7185'],
                borderWidth: 0,
            }],
        };
    }, [orders]);

    const clientsByWeekData = useMemo(() => {
        const now = new Date();
        const labels = [];
        const counts = [];
        for (let i = 7; i >= 0; i -= 1) {
            const start = new Date(now);
            start.setDate(now.getDate() - (i * 7));
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            const count = clients.filter((c) => {
                const created = new Date(c.created_at);
                return created >= start && created < end;
            }).length;
            labels.push(`S-${i}`);
            counts.push(count);
        }
        return {
            labels,
            datasets: [{
                label: 'Nouveaux clients',
                data: counts,
                backgroundColor: '#6366f1',
                borderRadius: 8,
            }],
        };
    }, [clients]);

    const topProductsChartData = useMemo(() => ({
        labels: topProducts.map(([name]) => (name.length > 40 ? `${name.slice(0, 40)}…` : name)),
        datasets: [{
            label: 'Unités vendues',
            data: topProducts.map(([, count]) => count),
            backgroundColor: ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'],
            borderRadius: 8,
        }],
    }), [topProducts]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    // Composant carte statistique
    const StatCard = ({ title, value, icon: Icon, colorClass, gradientClass }) => (
        <div className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${gradientClass} transition-transform duration-500 group-hover:scale-150`}></div>
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{title}</p>
                    <h3 className={`text-2xl font-black ${colorClass}`}>{value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${gradientClass}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-sans transition-colors duration-200">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white tracking-tight">
                            Tableau de bord
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Bienvenue, voici l'aperçu de votre activité commerciale.
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        <Clock className="w-4 h-4 text-cyan-500" />
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Chiffre d'Affaires"
                        value={`${stats.totalRevenue.toLocaleString()} ${currentSymbol}`}
                        icon={DollarSign}
                        colorClass="text-gray-900 dark:text-white"
                        gradientClass="bg-gradient-to-br from-indigo-400 to-indigo-600"
                    />
                    <StatCard
                        title="Commandes"
                        value={stats.totalOrders}
                        icon={ShoppingCart}
                        colorClass="text-gray-900 dark:text-white"
                        gradientClass="bg-gradient-to-br from-cyan-400 to-cyan-600"
                    />
                    <StatCard
                        title="Clients"
                        value={stats.totalClients}
                        icon={Users}
                        colorClass="text-gray-900 dark:text-white"
                        gradientClass="bg-gradient-to-br from-amber-400 to-amber-600"
                    />
                    <StatCard
                        title="Produits Actifs"
                        value={stats.totalProducts}
                        icon={Package}
                        colorClass="text-gray-900 dark:text-white"
                        gradientClass="bg-gradient-to-br from-emerald-400 to-emerald-600"
                    />
                </div>

                {/* Analytics Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-5">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Evolution du chiffre d'affaires (30 jours)</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Montants des commandes par date de création.</p>
                        </div>
                        <div className="h-72">
                            <Line data={revenueByDay} options={commonChartOptions} />
                        </div>
                    </div>

                    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-5">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Statut de paiement</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Part des commandes reglees vs non reglees.</p>
                        </div>
                        <div className="h-72">
                            <Doughnut
                                data={paymentStatusData}
                                options={{
                                    ...commonChartOptions,
                                    scales: undefined,
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-5">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Top 5 des produits les plus vendus</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Classement par quantité vendue, toutes commandes confondues (payées ou non).</p>
                        </div>
                        <div className="h-72">
                            {topProducts.length > 0 ? (
                                <Bar
                                    data={topProductsChartData}
                                    options={{
                                        ...commonChartOptions,
                                        indexAxis: 'y',
                                        plugins: {
                                            ...commonChartOptions.plugins,
                                            legend: { display: false },
                                        },
                                    }}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 italic">
                                    Aucune vente enregistrée pour le moment.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-5">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Nouveaux clients par semaine</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Suivi de l'acquisition client sur les 8 dernieres semaines.</p>
                        </div>
                        <div className="h-72">
                            <Bar
                                data={clientsByWeekData}
                                options={{
                                    ...commonChartOptions,
                                    plugins: {
                                        ...commonChartOptions.plugins,
                                        legend: { display: false },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-5">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Statut de livraison</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Repartition des commandes selon leur avancement.</p>
                    </div>
                    <div className="h-80">
                        <Bar
                            data={deliveryStatusData}
                            options={{
                                ...commonChartOptions,
                                plugins: {
                                    ...commonChartOptions.plugins,
                                    legend: { display: false },
                                },
                            }}
                        />
                    </div>
                </div>

                {/* Contenu divisé en deux colonnes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Section Commandes Récentes */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                                Dernières Commandes
                            </h2>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody>
                                    {recentOrders.length > 0 ? recentOrders.map((order) => (
                                        <tr key={order.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.statut_livraison === 'livre' ? 'bg-green-100 text-green-600' :
                                                        order.statut_livraison === 'en_cours' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {order.statut_livraison === 'livre' ? <CheckCircle2 size={16} /> : <Truck size={16} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{getOrderReference(order)}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.nom || 'Client inconnu'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${isOrderPaid(order) ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {formatPaymentStatus(order.statut_paiement)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-black text-sm text-gray-900 dark:text-white">{order.montant_total} {currentSymbol}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    {formatOrderDate(order.created_at)}
                                                </p>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                                                Aucune commande n'a été trouvée.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section Top 5 Clients */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-500" />
                                Top 5 clients
                            </h2>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody>
                                    {topClients.length > 0 ? topClients.map((client, index) => (
                                        <tr key={client.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                                                        {client.nom?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white">
                                                            #{index + 1} {client.nom || 'Client inconnu'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                                            {client.telephone || client.email || 'Contact non renseigné'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    {client.orderCount} commande{client.orderCount > 1 ? 's' : ''}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-black text-sm text-gray-900 dark:text-white">
                                                    {client.totalSpent.toLocaleString()} {currentSymbol}
                                                </p>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                                                Aucun client avec commande payée.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
