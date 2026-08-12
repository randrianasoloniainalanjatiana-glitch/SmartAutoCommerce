import React, { useState, useEffect } from "react";
import {
    ArrowLeftRight, Store, Facebook, TrendingDown, TrendingUp, Minus,
    Calendar, ExternalLink, ThumbsUp, MessageCircle, Package,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchHistoriqueComparaisons } from "../../services/veilleFacebookApi";

const formatPrix = (val) => {
    if (val == null || val === "") return "—";
    return Number(val).toLocaleString("fr-FR") + " Ar";
};

const formatDate = (iso) => {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("fr-FR", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return iso;
    }
};

const DiffBadge = ({ difference, avantage }) => {
    if (avantage === "egal") {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <Minus size={12} /> Égal
            </span>
        );
    }
    const isCheaper = avantage === "utilisateur";
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isCheaper
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            }`}>
            {isCheaper ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {isCheaper ? "-" : "+"}{formatPrix(Math.abs(difference))}
        </span>
    );
};

function ProductBlock({ type, data, prix }) {
    const isUser = type === "utilisateur";
    const name = isUser ? data?.name : data?.produit_nom;
    const image = isUser ? data?.image_urls : null;

    return (
        <div className={`flex-1 rounded-2xl border-2 overflow-hidden transition-all ${isUser
            ? "border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800"
            : "border-orange-300 dark:border-orange-700 bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800"
            }`}>
            <div className={`px-4 py-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${isUser
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                : "bg-orange-500/10 text-orange-700 dark:text-orange-300"
                }`}>
                {isUser ? <Store size={14} /> : <Facebook size={14} />}
                {isUser ? "Votre produit" : `Concurrent — ${data?.concurrent || "Facebook"}`}
            </div>

            <div className="p-5">
                <div className="aspect-video w-full max-h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4 flex items-center justify-center">
                    {image ? (
                        <img src={image} alt={name || "Produit"} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                            <Package size={40} strokeWidth={1.25} className="opacity-50 mb-2" />
                            <span className="text-xs">Pas d'image</span>
                        </div>
                    )}
                </div>

                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-2 line-clamp-2">
                    {name || "Produit inconnu"}
                </h4>

                {isUser && data?.category && (
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 mb-3">
                        {data.category}
                    </span>
                )}

                <p className={`text-2xl font-black mb-3 ${isUser ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {formatPrix(prix)}
                </p>

                {isUser && data?.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{data.description}</p>
                )}

                {!isUser && data?.resume_fr && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{data.resume_fr}</p>
                )}

                {!isUser && (
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        {data?.likes != null && (
                            <span className="flex items-center gap-1"><ThumbsUp size={12} /> {data.likes}</span>
                        )}
                        {data?.comments != null && (
                            <span className="flex items-center gap-1"><MessageCircle size={12} /> {data.comments}</span>
                        )}
                        {data?.date_post && (
                            <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(data.date_post)}</span>
                        )}
                    </div>
                )}

                {!isUser && data?.lien_facebook && (
                    <a
                        href={data.lien_facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <ExternalLink size={12} /> Voir sur Facebook
                    </a>
                )}
            </div>
        </div>
    );
}

function ComparisonDetail({ item }) {
    if (!item) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 dark:text-gray-500">
                <ArrowLeftRight size={48} strokeWidth={1.25} className="opacity-40 mb-4" />
                <p className="text-sm font-medium">Sélectionnez une comparaison dans la liste</p>
                <p className="text-xs mt-1">Les détails s'afficheront ici</p>
            </div>
        );
    }

    const prixUtil = item.produit_utilisateur?.price ?? 0;
    const prixConc = item.produit_concurrent?.prix ?? 0;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Calendar size={13} /> {formatDate(item.created_at)}
                    </p>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mt-1">Comparaison de prix</h3>
                </div>
                <DiffBadge difference={item.difference_prix} avantage={item.avantage} />
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                <ProductBlock type="utilisateur" data={item.produit_utilisateur} prix={prixUtil} />

                <div className="flex lg:flex-col items-center justify-center gap-2 shrink-0 py-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <ArrowLeftRight size={18} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wide">Écart</p>
                        <p className={`text-sm font-black ${item.avantage === "utilisateur"
                            ? "text-green-600 dark:text-green-400"
                            : item.avantage === "concurrent"
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400"
                            }`}>
                            {item.difference_pct > 0 ? "+" : ""}{item.difference_pct}%
                        </p>
                    </div>
                </div>

                <ProductBlock type="concurrent" data={item.produit_concurrent} prix={prixConc} />
            </div>

            {item.avantage === "concurrent" && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
                    Le concurrent propose un prix inférieur de <strong>{formatPrix(Math.abs(item.difference_prix))}</strong> ({Math.abs(item.difference_pct)}%).
                </div>
            )}
            {item.avantage === "utilisateur" && (
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-300">
                    Votre prix est inférieur de <strong>{formatPrix(Math.abs(item.difference_prix))}</strong> ({Math.abs(item.difference_pct)}%) — avantage concurrentiel.
                </div>
            )}
        </div>
    );
}

function DifferencePrixTab({ initialHistoriqueId = null }) {
    const { user } = useAuth();
    const [historique, setHistorique] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            setError("Utilisateur non connecté.");
            return;
        }

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchHistoriqueComparaisons();
                const list = Array.isArray(data) ? data : [];
                setHistorique(list);
                if (list.length > 0) {
                    const targetId = initialHistoriqueId != null ? String(initialHistoriqueId) : null;
                    const match = targetId && list.some((item) => String(item.id) === targetId);
                    setSelectedId(match ? targetId : String(list[0].id));
                } else {
                    setSelectedId(null);
                }
            } catch (err) {
                const msg = err.response?.data?.error || err.response?.statusText || err.message;
                setError(msg || "Impossible de charger l'historique.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?.id, initialHistoriqueId]);

    const selected = historique.find((h) => String(h.id) === String(selectedId)) || null;

    useEffect(() => {
        if (!selectedId || loading) return;
        const el = document.getElementById(`historique-item-${selectedId}`);
        if (el) {
            el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [selectedId, loading, historique.length]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Chargement des comparaisons…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="font-bold">Erreur</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <ArrowLeftRight size={18} className="text-purple-500" />
                    Différences de prix — Votre catalogue vs concurrents Facebook
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Historique des analyses de prix entre vos produits et ceux des concurrents scrappés
                </p>
            </div>

            {historique.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <ArrowLeftRight size={48} strokeWidth={1.25} className="opacity-40 mb-4" />
                    <p className="font-medium">Aucune comparaison enregistrée</p>
                    <p className="text-xs mt-1">Les analyses de différence de prix apparaîtront ici</p>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row min-h-[500px]">
                    <div className="lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700 flex flex-col">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Historique ({historique.length})
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[400px] lg:max-h-none">
                            {historique.map((item) => {
                                const isActive = String(item.id) === String(selectedId);
                                const nomUtil = item.produit_utilisateur?.name || "Produit";
                                const nomConc = item.produit_concurrent?.produit_nom || "Concurrent";
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        id={`historique-item-${item.id}`}
                                        onClick={() => setSelectedId(String(item.id))}
                                        className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 transition-all ${isActive
                                            ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-700/30 border-l-4 border-l-transparent"
                                            }`}
                                    >
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                                            {formatDate(item.created_at)}
                                        </p>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                            {nomUtil}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                            vs {nomConc}
                                        </p>
                                        <div className="mt-2">
                                            <DiffBadge difference={item.difference_prix} avantage={item.avantage} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 p-5 lg:p-6">
                        <ComparisonDetail item={selected} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default DifferencePrixTab;
