import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Calendar, Clock, Download } from 'lucide-react';

const API_BASE_URL = "http://localhost:8000/api";

const TransactionHistory = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Get User ID
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?.id;

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/subscription/status/${userId}/`);
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [userId]);

    if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex items-center justify-center">Chargement de l'historique...</div>;

    if (!user) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex items-center justify-center">Veuillez vous connecter.</div>;

    const history = data?.history || [];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 lg:p-12 text-gray-800 dark:text-gray-200 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Historique des Transactions</h1>
                    <p className="text-gray-600 dark:text-gray-400">Consultez et suivez vos paiements liés à SmartAutoCommerce.</p>
                </div>

                {/* Current Subscription Card */}
                {data && data.status !== 'no_subscription' && (
                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex flex-shrink-0 items-center justify-center border border-blue-500/30">
                                <CreditCard className="text-blue-600 dark:text-blue-400 w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Abonnement Actuel</p>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{data.type_plan.replace('_', ' ')}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded block mt-1 ${data.statut === 'actif' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                        {data.statut}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-8 bg-gray-100 dark:bg-gray-950/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Début</p>
                                <p className="font-medium text-gray-800 dark:text-gray-300">{new Date(data.debut_periode_actuelle).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Prochain Renouvellement</p>
                                <p className="font-medium text-gray-800 dark:text-gray-300">{new Date(data.fin_periode_actuelle).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transactions Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-lg">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock size={20} className="text-gray-500 dark:text-gray-400" /> Historique récent
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-sm">
                                    <th className="py-4 px-6 font-medium">Date</th>
                                    <th className="py-4 px-6 font-medium">ID Transaction</th>
                                    <th className="py-4 px-6 font-medium">Plan</th>
                                    <th className="py-4 px-6 font-medium">Statut</th>
                                    <th className="py-4 px-6 font-medium text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {history.length > 0 ? (
                                    history.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-800 dark:text-gray-300">
                                                {new Date(tx.cree_le).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-6 font-mono text-xs text-gray-500">
                                                {tx.id_commande_paypal}
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap capitalize text-sm text-gray-800 dark:text-gray-300">
                                                {tx.type_plan}
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${tx.statut === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-500/20' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-500/20'}
                        `}>
                                                    {tx.statut === 'COMPLETED' ? 'Terminé' : 'En attente'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap text-right font-bold text-gray-900 dark:text-white">
                                                {tx.montant} {tx.devise}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-10 px-6 text-center text-gray-500">
                                            Aucune transaction trouvée.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionHistory;
