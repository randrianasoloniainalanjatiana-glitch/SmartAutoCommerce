import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../components/SubscriptionGuard";
import {
    Lock, TrendingUp, ChevronLeft, ChevronRight, Sparkles, Target, CheckCircle2, Package, Award, BarChart3,
    ListOrdered, XCircle, ExternalLink,
} from "lucide-react";
import { StarRating } from "../components/StarRating";

function Sourcing() {
    const { user } = useAuth();
    const { isRestricted } = useSubscription();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sourceSite, setSourceSite] = useState("");
    const [classementPage, setClassementPage] = useState(1);
    const [futurPage, setFuturPage] = useState(1);

    const CLASSEMENT_PAGE_SIZE = 10;
    const FUTUR_PAGE_SIZE = 8;

    useEffect(() => {
        if (!user?.id || isRestricted) { setLoading(false); return; }
        fetchSourcing();
    }, [user?.id, isRestricted, sourceSite, classementPage, futurPage]);

    // Reset pages if sourceSite changes
    useEffect(() => {
        setClassementPage(1);
        setFuturPage(1);
    }, [sourceSite]);

    const fetchSourcing = async () => {
        try {
            let url = "/api/amazon/sourcing/api/scores";
            const params = new URLSearchParams();
            if (user?.id) params.set("user_id", user.id);
            if (sourceSite) params.set("source_site", sourceSite);
            params.set("classement_page", classementPage);
            params.set("futur_page", futurPage);
            params.set("limit_classement", CLASSEMENT_PAGE_SIZE);
            params.set("limit_futur", FUTUR_PAGE_SIZE);
            
            if (params.toString()) url += `?${params.toString()}`;
            const res = await fetch(url, {
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
            const d = await res.json();
            setData(d);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isRestricted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 mt-8 max-w-2xl mx-auto">
                <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full flex flex-col items-center">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-5 rounded-full mb-6"><Lock className="w-12 h-12 text-orange-600 dark:text-orange-400" /></div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Sourcing <span className="text-orange-500">Premium</span></h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Réservé aux abonnés actifs.</p>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('show-subscription-modal'))} className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black rounded-xl shadow-lg w-full max-w-sm">ACTIVER MON ABONNEMENT</button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Analyse du sourcing…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto mt-10 p-6 text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
                <h2 className="text-lg font-bold mb-2">Erreur</h2><p className="text-sm">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/50 rounded-md text-sm font-semibold">Réessayer</button>
            </div>
        );
    }

    const profils = data?.profils || [];
    const totalProfils = data?.total_profils || 0;
    const classementTotalPages = Math.max(1, Math.ceil(totalProfils / CLASSEMENT_PAGE_SIZE));
    const classementPageClamped = Math.min(Math.max(1, classementPage), classementTotalPages);
    const classementOffset = (classementPageClamped - 1) * CLASSEMENT_PAGE_SIZE;

    const opportunites = data?.opportunites || [];
    const nbRecommandes = data?.nb_recommandes || 0;
    const scoreMax = data?.score_max || 0;
    const potentielFutur = data?.potentiel_futur || [];
    const totalFutur = data?.total_potentiel_futur || 0;
    const nbPotentielFutur = data?.nb_potentiel_futur ?? totalFutur;
    const scoreFuturMax = data?.score_potentiel_futur_max || 0;

    const futurTotalPages = Math.max(1, Math.ceil(totalFutur / FUTUR_PAGE_SIZE));
    const futurPageClamped = Math.min(Math.max(1, futurPage), futurTotalPages);
    const futurOffset = (futurPageClamped - 1) * FUTUR_PAGE_SIZE;

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 md:p-8 transition-colors">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 border-b border-gray-300 dark:border-gray-700 pb-6">
                    <div className="flex flex-wrap items-end gap-3 justify-between">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                                <Target size={28} className="text-orange-500 shrink-0" />
                                Outil de <span className="text-orange-500">Sourcing</span>
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Identifie les produits à fort potentiel commercial</p>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Marketplace</label>
                            <select value={sourceSite} onChange={e => setSourceSite(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 min-w-[140px]">
                                <option value="">Toutes</option>
                                {[...new Set((data?.profils || []).map(p => p.source_site).filter(Boolean))].sort().map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-green-200 dark:border-green-700 shadow-sm text-center">
                        <div className="flex justify-center mb-1 text-green-600 dark:text-green-400"><CheckCircle2 size={28} /></div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{nbRecommandes}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Produits recommandés</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
                        <div className="flex justify-center mb-1 text-gray-600 dark:text-gray-300"><Package size={28} /></div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{totalProfils}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Produits analysés</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-yellow-200 dark:border-yellow-700 shadow-sm text-center">
                        <div className="flex justify-center mb-1 text-amber-500"><Award size={28} /></div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{scoreMax}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Score maximum</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-violet-200 dark:border-violet-700 shadow-sm text-center">
                        <div className="flex justify-center mb-1 text-violet-500"><Sparkles size={28} /></div>
                        <div className="text-2xl font-black text-violet-600 dark:text-violet-400 tabular-nums">
                            {scoreFuturMax > 0 ? `${Math.round(scoreFuturMax)}%` : "—"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Meilleur score « demain »</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">sur {nbPotentielFutur || potentielFutur.length} produit{(nbPotentielFutur || potentielFutur.length) !== 1 ? "s" : ""}</div>
                    </div>
                </div>

                {/* Score chart as bars */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><TrendingUp size={16} /> <BarChart3 size={16} className="text-indigo-500" /> Score de sourcing par produit</h2>
                    </div>
                    <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                        {profils.slice(0, 20).map((p, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-[180px] truncate">{(p.produit || "").slice(0, 30)}…</span>
                                <div className="flex-1 h-5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${p.recommande ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-red-400 to-red-500"}`}
                                        style={{ width: `${Math.round(p.score_global || 0)}%` }}
                                    ></div>
                                </div>
                                <span className={`text-xs font-bold w-10 text-right ${p.recommande ? "text-green-500" : "text-red-500"}`}>
                                    {p.score_global}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Potentiel futur / tendance */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-violet-200 dark:border-violet-800 shadow-sm mb-6 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-white flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-2">
                                <Sparkles className="text-violet-500" size={18} /> Demande possible demain
                            </span>
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                ({totalFutur} produit{totalFutur !== 1 ? "s" : ""})
                            </span>
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                            Cette section montre une <strong className="text-gray-700 dark:text-gray-300">shortlist de produits à forte probabilité de vente future</strong>,
                            selon la note, le rapport qualité/prix, la traction d&apos;avis et une demande actuelle encore modérée.
                            Ce n&apos;est pas une prévision des recherches Google réelles.
                        </p>
                    </div>
                    {potentielFutur.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Aucun produit dans ton catalogue à analyser pour l&apos;instant.
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                {potentielFutur.map((p, i) => (
                                    <div
                                        key={p.asin || futurOffset + i}
                                        className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/40 p-4 flex gap-3 hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
                                    >
                                        {p.image_url && (
                                            <a href={p.lien} target="_blank" rel="noopener noreferrer" className="shrink-0 w-20 h-20 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                                                <img src={p.image_url} alt="" className="max-w-full max-h-full object-contain" loading="lazy" />
                                            </a>
                                        )}
                                        <div className="min-w-0 flex-1 flex flex-col">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-semibold px-2 py-0.5 rounded">{p.categorie}</span>
                                                <span className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                                    futur {Math.round(p.score_potentiel_futur || 0)}%
                                                </span>
                                                {p.recommande_classique && (
                                                    <span className="text-[10px] text-green-600 dark:text-green-400">aussi reco classique</span>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 mb-2">{p.produit}</h3>
                                            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                                                <span>{p.note}/5</span>
                                                <span>·</span>
                                                <span>{(p.nb_avis || 0).toLocaleString("fr-FR")} avis</span>
                                                <span>·</span>
                                                <span>{p.achats_mensuels > 0 ? `${p.achats_mensuels}+ ach./mois` : "achats faibles / n.d."}</span>
                                            </div>
                                            {p.signaux && p.signaux.length > 0 && (
                                                <ul className="space-y-0.5 mb-2">
                                                    {p.signaux.slice(0, 4).map((s, si) => (
                                                        <li key={si} className="text-[11px] text-cyan-700 dark:text-cyan-400 leading-snug">→ {s}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <span className="text-xs text-gray-400">Sourcing actuel : <span className="tabular-nums text-gray-600 dark:text-gray-300">{p.score_sourcing_actuel}</span></span>
                                                <a href={p.lien} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg">{p.source_site ? String(p.source_site).toUpperCase() : "Ouvrir"} <ExternalLink size={12} /></a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {totalFutur > FUTUR_PAGE_SIZE && (
                                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {futurOffset + 1}–{Math.min(futurOffset + FUTUR_PAGE_SIZE, totalFutur)} sur {totalFutur}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={futurPageClamped <= 1}
                                            onClick={() => setFuturPage((x) => Math.max(1, x - 1))}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            <ChevronLeft size={14} /> Précédent
                                        </button>
                                        <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                                            Page {futurPageClamped} / {futurTotalPages}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={futurPageClamped >= futurTotalPages}
                                            onClick={() => setFuturPage((x) => Math.min(futurTotalPages, x + 1))}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            Suivant <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Opportunités */}
                {opportunites.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-gray-500 dark:text-gray-400 font-semibold text-sm mb-4 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Opportunités recommandées ({opportunites.length})</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {opportunites.map((p, i) => (
                                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-700 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
                                    {p.image_url && (
                                        <div className="h-48 bg-white dark:bg-gray-700 p-3 flex items-center justify-center">
                                            <img src={p.image_url} alt="" className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                        </div>
                                    )}
                                    <div className="p-4 flex flex-col flex-grow border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold px-2 py-0.5 rounded">{p.categorie}</span>
                                            <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded"><CheckCircle2 size={12} /> Recommandé</span>
                                        </div>
                                        <h3 className="text-gray-800 dark:text-gray-200 text-sm font-semibold line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors">
                                            {(p.produit || "").slice(0, 80)}{(p.produit || "").length > 80 ? "…" : ""}
                                        </h3>

                                        {/* Score */}
                                        <div className="mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full" style={{ width: `${Math.round(p.score_global || 0)}%` }}></div>
                                                </div>
                                                <span className="text-green-500 text-xs font-bold">{p.score_global}</span>
                                            </div>
                                            <span className="text-gray-400 text-xs">Score potentiel</span>
                                        </div>

                                        {/* Raisons */}
                                        {p.raisons && p.raisons.length > 0 && (
                                            <div className="mb-2 space-y-0.5">
                                                {p.raisons.map((r, ri) => (
                                                    <span key={ri} className="block text-xs text-cyan-600 dark:text-cyan-400">→ {r}</span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 mb-2">
                                            <StarRating note={p.note} size={14} />
                                            <span className="text-gray-500 text-xs">{p.note}</span>
                                            <span className="text-gray-400 text-xs">({(p.nb_avis || 0).toLocaleString("fr-FR")} avis)</span>
                                        </div>

                                        {p.achats_mensuels > 0 && <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded mb-2 w-fit">{p.achats_mensuels}+ achats/mois</span>}

                                        <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">{typeof p.prix === "number" ? `${p.prix.toFixed(2)} €` : p.prix}</span>
                                            <a href={p.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 font-medium rounded-full text-xs border border-[#FCD200] transition-colors">{p.source_site ? String(p.source_site).toUpperCase() : "Ouvrir"} <ExternalLink size={12} /></a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tableau complet */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><ListOrdered size={18} className="text-orange-500" /> Classement complet</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">#</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Produit</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Cat.</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Prix</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Note</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Avis</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Achats</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Ratio Q/P</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Score</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Reco</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profils.map((p, i) => (
                                    <tr key={classementOffset + i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 text-gray-400">{classementOffset + i + 1}</td>
                                        <td className="px-4 py-3 max-w-[200px] text-gray-800 dark:text-gray-200 text-xs">{(p.produit || "").slice(0, 45)}…</td>
                                        <td className="px-4 py-3"><span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5 rounded">{p.categorie}</span></td>
                                        <td className="px-4 py-3 text-orange-600 dark:text-orange-400 font-bold">{typeof p.prix === "number" ? `${p.prix.toFixed(2)}€` : p.prix}</td>
                                        <td className="px-4 py-3">{p.note}/5</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{(p.nb_avis || 0).toLocaleString("fr-FR")}</td>
                                        <td className="px-4 py-3">
                                            {p.achats_mensuels > 0
                                                ? <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded">{p.achats_mensuels}+</span>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.rapport_qp}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${p.recommande ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.round(p.score_global || 0)}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold">{p.score_global}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.recommande
                                                ? <span className="inline-flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded text-xs"><CheckCircle2 size={14} /></span>
                                                : <span className="inline-flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded text-xs"><XCircle size={14} /></span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalProfils > CLASSEMENT_PAGE_SIZE && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {classementOffset + 1}–{Math.min(classementOffset + CLASSEMENT_PAGE_SIZE, totalProfils)} sur {totalProfils}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={classementPageClamped <= 1}
                                    onClick={() => setClassementPage((p) => Math.max(1, p - 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                    <ChevronLeft size={14} /> Précédent
                                </button>
                                <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                                    Page {classementPageClamped} / {classementTotalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={classementPageClamped >= classementTotalPages}
                                    onClick={() => setClassementPage((p) => Math.min(classementTotalPages, p + 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                    Suivant <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Sourcing;
