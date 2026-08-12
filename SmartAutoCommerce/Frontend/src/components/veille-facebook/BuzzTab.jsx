import React, { useState, useEffect } from "react";
import {
    TrendingUp, ExternalLink, ChevronLeft, ChevronRight,
    Package, Flame, Siren, Zap, Trophy, ThumbsUp, MessageCircle, Link2, X,
} from "lucide-react";
import { fetchBuzzList, fetchBuzzStats } from "../../services/veilleFacebookApi";

const PAGE_SIZE = 15;

const statusBadge = (status) => {
    const map = {
        "ULTRA-PRIORITY": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
        "HIGH": "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
        "NORMAL": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    };
    return map[status] || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
};

const formatPrix = (val) => {
    if (!val) return "—";
    return Number(val).toLocaleString("fr-FR") + " Ar";
};

function BuzzTab() {
    const [stats, setStats] = useState(null);
    const [produits, setProduits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);

    // Filtres
    const [concurrent, setConcurrent] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Liste unique pour le filtre concurrent
    const [concurrents, setConcurrents] = useState([]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { limit: 200 };
            if (concurrent) params.concurrent = concurrent;
            if (statusFilter) params.status = statusFilter;

            const [buzzData, statsData] = await Promise.all([
                fetchBuzzList(params),
                fetchBuzzStats(),
            ]);
            setProduits(buzzData || []);
            setStats(statsData);

            // Extraire les listes uniques
            if (!concurrent && !statusFilter) {
                const concs = [...new Set(buzzData.map(p => p.concurrent).filter(Boolean))].sort();
                setConcurrents(concs);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [concurrent, statusFilter]);
    useEffect(() => { setPage(1); }, [concurrent, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(produits.length / PAGE_SIZE));
    const pageClamped = Math.min(Math.max(1, page), totalPages);
    const offset = (pageClamped - 1) * PAGE_SIZE;
    const slice = produits.slice(offset, offset + PAGE_SIZE);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Chargement des données buzz…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="font-bold">Erreur</p>
                <p className="text-sm mt-1">{error}</p>
                <button onClick={loadData} className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-sm font-semibold">Réessayer</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPIs */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Total Produits", value: stats.nb_produits_total, gradient: "from-blue-400 to-blue-600", Icon: Package },
                        { label: "Score Max", value: Math.round(stats.score_engagement_max).toLocaleString("fr-FR"), gradient: "from-purple-400 to-purple-600", Icon: Flame },
                        { label: "ULTRA-PRIORITY", value: stats.nb_ultra_priority, gradient: "from-red-400 to-red-600", Icon: Siren },
                        { label: "HIGH", value: stats.nb_high, gradient: "from-orange-400 to-orange-600", Icon: Zap },
                    ].map((kpi) => {
                        const KpiIcon = kpi.Icon;
                        return (
                        <div key={kpi.label} className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xl border border-gray-100 dark:border-gray-700 group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 bg-gradient-to-br ${kpi.gradient} transition-transform duration-500 group-hover:scale-150`}></div>
                            <div className="relative z-10">
                                <KpiIcon className="text-gray-700 dark:text-gray-200" size={22} strokeWidth={2} />
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{kpi.value}</p>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">{kpi.label}</p>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {/* Filtres */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-wrap gap-3">
                    <select
                        value={concurrent}
                        onChange={e => setConcurrent(e.target.value)}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                    >
                        <option value="">Tous les concurrents</option>
                        {concurrents.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="ULTRA-PRIORITY">ULTRA-PRIORITY</option>
                        <option value="HIGH">HIGH</option>
                        <option value="NORMAL">NORMAL</option>
                    </select>
                    {(concurrent || statusFilter) && (
                        <button
                            onClick={() => { setConcurrent(""); setStatusFilter(""); }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                            <X size={14} /> Réinitialiser
                        </button>
                    )}
                </div>
            </div>

            {/* Tableau des produits */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <TrendingUp size={16} /> <Trophy size={16} className="text-amber-500" /> Top Produits par Engagement
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{produits.length} résultat(s)</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Produit</th>
                                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Concurrent</th>
                                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Prix</th>
                                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Score</th>
                                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Status</th>
                                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold"><span className="inline-flex justify-end w-full"><ThumbsUp size={14} /></span></th>
                                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold"><span className="inline-flex justify-end w-full"><MessageCircle size={14} /></span></th>
                                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold"><span className="inline-flex justify-center w-full"><Link2 size={14} /></span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {slice.map((p, i) => (
                                <tr key={p.id_unique || i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3 max-w-[250px]">
                                        <p className="text-gray-800 dark:text-gray-200 text-xs font-medium truncate">{p.produit_nom || "—"}</p>
                                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block">{p.categorie}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{p.concurrent}</td>
                                    <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-bold text-xs">{formatPrix(p.prix)}</td>
                                    <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">{Math.round(p.score_engagement).toLocaleString("fr-FR")}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${statusBadge(p.priority_status)}`}>
                                            {p.priority_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{(p.likes || 0).toLocaleString("fr-FR")}</td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{(p.comments || 0).toLocaleString("fr-FR")}</td>
                                    <td className="px-4 py-3 text-center">
                                        {p.lien_facebook ? (
                                            <a href={p.lien_facebook} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 transition-colors">
                                                <ExternalLink size={14} />
                                            </a>
                                        ) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {produits.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {offset + 1}–{Math.min(offset + PAGE_SIZE, produits.length)} sur {produits.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button disabled={pageClamped <= 1} onClick={() => setPage(p => p - 1)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600">
                                <ChevronLeft size={14} /> Précédent
                            </button>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Page {pageClamped} / {totalPages}</span>
                            <button disabled={pageClamped >= totalPages} onClick={() => setPage(p => p + 1)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600">
                                Suivant <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BuzzTab;
