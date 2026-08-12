import React, { useState, useEffect } from "react";
import { ExternalLink, Rocket, Inbox, Sprout, Search, Calendar, Link2 } from "lucide-react";
import { fetchTendancesFrequence, fetchTendancesLancements, fetchTendancesEmergents } from "../../services/veilleFacebookApi";

const formatPrix = (val) => {
    if (!val) return "—";
    return Number(val).toLocaleString("fr-FR") + " Ar";
};

const jourLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function TendancesTab() {
    const [frequence, setFrequence] = useState([]);
    const [lancements, setLancements] = useState([]);
    const [emergents, setEmergents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joursFilter, setJoursFilter] = useState(30);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [freq, lanc, emerg] = await Promise.all([
                fetchTendancesFrequence(),
                fetchTendancesLancements(joursFilter),
                fetchTendancesEmergents(),
            ]);
            setFrequence(freq || []);
            setLancements(lanc || []);
            setEmergents(emerg || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [joursFilter]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Chargement des tendances…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="font-bold">Erreur</p><p className="text-sm mt-1">{error}</p>
                <button onClick={loadData} className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-sm font-semibold">Réessayer</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Lancements récents */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Rocket size={18} className="text-blue-500" /> Lancements récents (HIGH / ULTRA)</h3>
                    <div className="flex gap-2">
                        {[7, 30, 90].map((j) => (
                            <button
                                key={j}
                                onClick={() => setJoursFilter(j)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${joursFilter === j
                                    ? "bg-blue-500 text-white border-blue-500 shadow-md"
                                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                                    }`}
                            >
                                {j}j
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {lancements.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Produit</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Concurrent</th>
                                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Prix</th>
                                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Score</th>
                                    <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Status</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Date</th>
                                    <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold"><span className="inline-flex justify-center w-full"><Link2 size={14} /></span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lancements.slice(0, 30).map((p, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 max-w-[220px]">
                                            <p className="text-gray-800 dark:text-gray-200 text-xs font-medium truncate">{p.produit_nom || "—"}</p>
                                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block">{p.categorie}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{p.concurrent}</td>
                                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-bold text-xs">{formatPrix(p.prix)}</td>
                                        <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">{Math.round(p.score_engagement || 0).toLocaleString("fr-FR")}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${p.priority_status === "ULTRA-PRIORITY"
                                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                                                }`}>
                                                {p.priority_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{p.date_post ? p.date_post.substring(0, 10) : "—"}</td>
                                        <td className="px-4 py-3 text-center">
                                            {p.lien_facebook ? (
                                                <a href={p.lien_facebook} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700"><ExternalLink size={14} /></a>
                                            ) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <span className="flex justify-center mb-3"><Inbox size={40} strokeWidth={1.25} className="opacity-50" /></span>
                            <p>Aucun lancement récent détecté sur les {joursFilter} derniers jours.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Produits émergents */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Sprout size={18} className="text-green-500" /> Produits émergents</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Produits postés au moins 2 fois en moins de 14 jours par le même concurrent</p>
                </div>
                <div className="p-4">
                    {emergents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {emergents.map((e, i) => (
                                <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:shadow-lg transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs px-2 py-0.5 rounded font-semibold">{e.categorie}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{e.nb_posts} posts</span>
                                    </div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{e.concurrent}</p>
                                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <div className="flex justify-between"><span>Score total</span><span className="font-bold text-gray-900 dark:text-white">{Math.round(e.score_engagement_total).toLocaleString("fr-FR")}</span></div>
                                        <div className="flex justify-between"><span>Dernier post</span><span>{e.dernier_post ? e.dernier_post.substring(0, 10) : "—"}</span></div>
                                    </div>
                                    {e.liste_des_posts && e.liste_des_posts.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-[10px] text-gray-400 mb-1 uppercase font-semibold">Posts associés</p>
                                            {e.liste_des_posts.slice(0, 3).map((post, j) => (
                                                <p key={j} className="text-[11px] text-gray-500 dark:text-gray-400 truncate">• {post.produit_nom}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <span className="flex justify-center mb-3"><Search size={40} strokeWidth={1.25} className="opacity-50" /></span>
                            <p>Aucun produit émergent détecté.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Fréquence de publication */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Calendar size={18} className="text-cyan-500" /> Fréquence de publication par concurrent</h3>
                </div>
                <div className="overflow-x-auto">
                    {frequence.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Concurrent</th>
                                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Posts/sem</th>
                                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Total</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Jours actifs</th>
                                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Heure pic</th>
                                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Mois actif</th>
                                </tr>
                            </thead>
                            <tbody>
                                {frequence.map((f) => (
                                    <tr key={f.concurrent} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{f.concurrent}</td>
                                        <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{f.nb_posts_par_semaine_moyen}</td>
                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{f.nb_posts_total}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {(f.jours_actifs || []).slice(0, 3).map((j) => (
                                                    <span key={j} className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-[10px] px-1.5 py-0.5 rounded">{jourLabels[j] || j}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{f.heure_pic != null ? `${f.heure_pic}h` : "—"}</td>
                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{f.mois_le_plus_actif ? `M${f.mois_le_plus_actif}` : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-8 text-gray-400 p-4">
                            <p>Aucune donnée de fréquence disponible.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TendancesTab;
