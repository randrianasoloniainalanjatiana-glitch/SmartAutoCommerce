import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import axios from 'axios';
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

const Dashboard = () => {
    const { user } = useAuth();
    const { currentSymbol } = useSettings();
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        totalClients: 0,
        totalProducts: 0,
    });

    const [recentOrders, setRecentOrders] = useState([]);
    const [recentClients, setRecentClients] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.id) return;

            try {
                setLoading(true);

                // 1. Fetch Orders
                const ordersRes = await axios.get('http://localhost:8000/api/commandes/');
                const userOrders = ordersRes.data?.filter(item => item.id_utilisateur === user.id) || [];

                // Calculate total revenue from user orders
                const revenue = userOrders.reduce((sum, order) => sum + (parseFloat(order.montant_total) || 0), 0);

                // 2. Fetch Clients
                const clientsRes = await axios.get(`http://localhost:8000/api/client/?user_id=${user.id}`);
                // if API doesn't filter perfectly, fallback filter :
                const userClients = clientsRes.data?.filter(item => item.id_utilisateur === user.id) || [];

                // 3. Fetch Products
                const productsRes = await axios.get('http://localhost:8000/api/data/');
                const userProducts = productsRes.data?.filter(item => item.id_utilisateur === user.id) || [];

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

                // Set recent 5 clients
                setRecentClients(
                    userClients
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
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
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white">#{order.id}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.nom || 'Client inconnu'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${order.statut_paiement === 'paye' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {order.statut_paiement || 'Non payé'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-black text-sm text-gray-900 dark:text-white">{order.montant_total} {currentSymbol}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    {new Date(order.created_at).toLocaleDateString()}
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

                    {/* Section Nouveaux Clients */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-500" />
                                Nouveaux Clients
                            </h2>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody>
                                    {recentClients.length > 0 ? recentClients.map((client) => (
                                        <tr key={client.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                                                        {client.nom?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{client.nom || 'Client inconnu'}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{client.email || client.telephone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                    <MapPin size={12} className="text-gray-400" />
                                                    {client.adresse || 'N/A'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md inline-block">
                                                    {new Date(client.created_at).toLocaleDateString()}
                                                </p>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                                                Aucun client n'a été trouvé.
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

// SVG component helper qui évite d'importer toutes les icones lucide si y'a un bug
const MapPin = ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

export default Dashboard;
