import React, { useState, useEffect } from "react";
import { Download, Target, Package, AlertTriangle, Star } from "lucide-react";
import { fetchCatalogueOpportunites, fetchCatalogueStars, fetchCatalogueEviter } from "../../services/veilleFacebookApi";

const formatPrix = (val) => {
    if (!val) return "—";
    return Number(val).toLocaleString("fr-FR") + " Ar";
};

const recommandationBadge = (rec) => {
    const map = {
        "SOURCER EN PRIORITÉ": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700",
        "À CONSIDÉRER": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
        "SURVEILLER": "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600",
    };
    return map[rec] || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600";
};

const exportCSV = (data) => {
    if (!data || data.length === 0) return;
    const headers = ["Catégorie", "Nb Posts", "Score Demande Moyen", "Prix Local Moyen", "Prix Min", "Prix Max", "Concurrent Dominant", "Recommandation"];
    const rows = data.map(d => [
        d.categorie, d.nb_posts_total, d.score_demande_moyen,
        d.prix_local_moyen, d.prix_local_min, d.prix_local_max,
        d.concurrent_dominant, d.recommandation,
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opportunites_sourcing.csv";
    a.click();
    URL.revokeObjectURL(url);
};

function CatalogueTab() {
    const [opportunites, setOpportunites] = useState([]);
    const [stars, setStars] = useState([]);
    const [eviter, setEviter] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                const [opp, st, ev] = await Promise.all([
                    fetchCatalogueOpportunites(),
                    fetchCatalogueStars(),
                    fetchCatalogueEviter(),
                ]);
                setOpportunites(opp || []);
                setStars(st || []);
                setEviter(ev || []);
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
                <p className="text-gray-500 dark:text-gray-400">Chargement du catalogue…</p>
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

    return (
        <div className="space-y-6">

            {/* Opportunités de sourcing */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Target size={18} className="text-orange-500" /> Opportunités de sourcing</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Catégories à fort potentiel basées sur la demande Facebook locale</p>
                    </div>
                    <button
                        onClick={() => exportCSV(opportunites)}
                        disabled={opportunites.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm disabled:opacity-50 text-sm"
                    >
                        <Download size={14} /> Exporter CSV
                    </button>
                </div>
                <div className="p-4">
                    {opportunites.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {opportunites.map((opp) => (
                                <div key={opp.categorie} className="relative overflow-hidden p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:shadow-lg transition-all group">
                                    <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] uppercase font-black rounded-bl-xl border-l border-b ${recommandationBadge(opp.recommandation)}`}>
                                        {opp.recommandation}
                                    </div>

                                    <h4 className="font-bold text-base text-gray-800 dark:text-white mb-3 pr-20">{opp.categorie}</h4>

                                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                        <div className="flex justify-between"><span>Posts total</span><span className="font-bold text-gray-900 dark:text-white">{opp.nb_posts_total}</span></div>
                                        <div className="flex justify-between"><span>Score demande moyen</span><span className="font-bold text-purple-600 dark:text-purple-400">{opp.score_demande_moyen.toLocaleString("fr-FR")}</span></div>
                                        <div className="flex justify-between"><span>Prix local</span><span className="font-bold text-blue-600 dark:text-blue-400">{formatPrix(opp.prix_local_min)} – {formatPrix(opp.prix_local_max)}</span></div>
                                        <div className="flex justify-between"><span>Prix moyen</span><span className="font-bold">{formatPrix(opp.prix_local_moyen)}</span></div>
                                        <div className="flex justify-between"><span>Concurrent dominant</span><span className="font-semibold text-orange-600 dark:text-orange-400">{opp.concurrent_dominant}</span></div>
                                    </div>

                                    {opp.meilleur_produit && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1 flex items-center gap-1"><Star size={12} className="text-amber-500 fill-amber-500" /> Meilleur produit</p>
                                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{opp.meilleur_produit.produit_nom}</p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">Score: {Math.round(opp.meilleur_produit.score_engagement || 0).toLocaleString("fr-FR")} · {formatPrix(opp.meilleur_produit.prix)}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <span className="flex justify-center mb-3"><Package size={40} strokeWidth={1.25} className="opacity-50" /></span>
                            <p>Aucune opportunité détectée.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Produits stars */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Star size={18} className="text-amber-500 fill-amber-500" /> Produits stars — Fort potentiel immédiat</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Priority score &gt; 2500 · Prix entre 3 000 et 100 000 Ar</p>
                </div>
                <div className="overflow-x-auto">
                    {stars.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Produit</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Concurrent</th>
                                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Prix</th>
                                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Score Eng.</th>
                                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Priority</th>
                                    <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stars.slice(0, 20).map((p, i) => (
                                    <tr key={p.id_unique || i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 max-w-[220px]">
                                            <p className="text-gray-800 dark:text-gray-200 text-xs font-medium truncate">{p.produit_nom}</p>
                                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block">{p.categorie}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{p.concurrent}</td>
                                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-bold text-xs">{formatPrix(p.prix)}</td>
                                        <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">{Math.round(p.score_engagement || 0).toLocaleString("fr-FR")}</td>
                                        <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400 font-bold">{(p.priority_score || 0).toLocaleString("fr-FR")}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${p.priority_status === "ULTRA-PRIORITY"
                                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                                                }`}>
                                                {p.priority_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-8 text-gray-400 p-4">
                            <span className="flex justify-center mb-3"><Star size={40} strokeWidth={1.25} className="opacity-50 text-amber-500" /></span>
                            <p>Aucun produit star détecté avec les critères actuels.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Catégories à éviter */}
            {eviter.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Catégories à faible demande</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Score demande moyen &lt; 500 ou moins de 2 posts</p>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {eviter.map((e) => (
                                <div key={e.categorie} className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{e.categorie}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{e.nb_posts_total} post(s) · Score: {e.score_demande_moyen}</p>
                                    <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-1">{e.raison}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CatalogueTab;
