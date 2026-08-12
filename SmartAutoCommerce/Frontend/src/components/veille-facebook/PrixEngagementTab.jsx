import React, { useState, useEffect } from "react";
import {
    CircleDollarSign, BarChart3, LineChart, Tag, ThumbsUp, MessageCircle, Siren, Zap, CheckCircle2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { fetchPrixGrille, fetchEngagementConcurrents, fetchEngagementCategories, fetchEngagementPrix } from "../../services/veilleFacebookApi";

const formatPrix = (val) => {
    if (!val) return "—";
    return Number(val).toLocaleString("fr-FR") + " Ar";
};

function PrixEngagementTab() {
    const [prixGrille, setPrixGrille] = useState([]);
    const [engConcurrents, setEngConcurrents] = useState([]);
    const [engCategories, setEngCategories] = useState([]);
    const [engPrix, setEngPrix] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCatIndex, setSelectedCatIndex] = useState(0);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                const [grille, conc, cats, prix] = await Promise.all([
                    fetchPrixGrille(),
                    fetchEngagementConcurrents(),
                    fetchEngagementCategories(),
                    fetchEngagementPrix(),
                ]);
                setPrixGrille(grille || []);
                setEngConcurrents(conc || []);
                setEngCategories(cats || []);
                setEngPrix(prix || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Chargement prix & engagement…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="font-bold">Erreur</p><p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    const selectedCat = prixGrille[selectedCatIndex] || null;

    return (
        <div className="space-y-6">

            {/* Section Grille de prix */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><CircleDollarSign size={18} className="text-green-500" /> Grille de prix par concurrent</h3>
                </div>
                <div className="p-4">
                    {prixGrille.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {prixGrille.map((cat, i) => (
                                <button
                                    key={cat.categorie}
                                    onClick={() => setSelectedCatIndex(i)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${selectedCatIndex === i
                                        ? "bg-blue-500 text-white border-blue-500 shadow-md"
                                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                                        }`}
                                >
                                    {cat.categorie}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedCat && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                        <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Concurrent</th>
                                        <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Min</th>
                                        <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Max</th>
                                        <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Médian</th>
                                        <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Moyen</th>
                                        <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Nb</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedCat.concurrents.map((c) => (
                                        <tr key={c.concurrent} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{c.concurrent}</td>
                                            <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatPrix(c.prix_min)}</td>
                                            <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatPrix(c.prix_max)}</td>
                                            <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-bold">{formatPrix(c.prix_median)}</td>
                                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{formatPrix(c.prix_moyen)}</td>
                                            <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{c.nb_produits}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Section Engagement par concurrent */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500" /> Engagement par concurrent</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Concurrent</th>
                                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Posts</th>
                                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold"><span className="inline-flex items-center justify-end gap-1 w-full"><ThumbsUp size={14} /> Moy</span></th>
                                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold"><span className="inline-flex items-center justify-end gap-1 w-full"><MessageCircle size={14} /> Moy</span></th>
                                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Score Moy</th>
                                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold"><span className="inline-flex justify-center w-full"><Siren size={14} /></span></th>
                                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold"><span className="inline-flex justify-center w-full"><Zap size={14} /></span></th>
                                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold"><span className="inline-flex justify-center w-full"><CheckCircle2 size={14} /></span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {engConcurrents.map((c) => (
                                <tr key={c.concurrent} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{c.concurrent}</td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{c.nb_posts}</td>
                                    <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{Math.round(c.likes_moyen).toLocaleString("fr-FR")}</td>
                                    <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400">{Math.round(c.comments_moyen).toLocaleString("fr-FR")}</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{Math.round(c.score_engagement_moyen).toLocaleString("fr-FR")}</td>
                                    <td className="px-4 py-3 text-center"><span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-0.5 rounded-full font-bold">{c.nb_ultra}</span></td>
                                    <td className="px-4 py-3 text-center"><span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5 rounded-full font-bold">{c.nb_high}</span></td>
                                    <td className="px-4 py-3 text-center"><span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-bold">{c.nb_normal}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section Corrélation prix/engagement — Graphique */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><LineChart size={18} className="text-violet-500" /> Corrélation Prix / Engagement</h3>
                </div>
                <div className="p-4">
                    {engPrix.length > 0 ? (
                        <div style={{ width: "100%", height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={engPrix} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                                    <Tooltip
                                        contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="engagement_moyen" name="Engagement moyen" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="nb_posts" name="Nb posts" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm text-center py-8">Aucune donnée de corrélation disponible.</p>
                    )}
                </div>
            </div>

            {/* Section Engagement par catégorie */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Tag size={18} className="text-orange-500" /> Engagement par catégorie</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {engCategories.map((cat) => (
                        <div key={cat.categorie} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:shadow-md transition-all">
                            <h4 className="font-bold text-sm text-gray-800 dark:text-white">{cat.categorie}</h4>
                            <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                <div className="flex justify-between"><span>Score engagement moyen</span><span className="font-bold text-gray-900 dark:text-white">{Math.round(cat.score_engagement_moyen).toLocaleString("fr-FR")}</span></div>
                                <div className="flex justify-between"><span>Nb posts</span><span className="font-bold">{cat.nb_posts}</span></div>
                                <div className="flex justify-between"><span>Prix moyen</span><span className="font-bold text-blue-600 dark:text-blue-400">{formatPrix(cat.prix_moyen)}</span></div>
                                <div className="flex justify-between"><span>Concurrent dominant</span><span className="font-semibold text-purple-600 dark:text-purple-400">{cat.concurrent_dominant}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PrixEngagementTab;
