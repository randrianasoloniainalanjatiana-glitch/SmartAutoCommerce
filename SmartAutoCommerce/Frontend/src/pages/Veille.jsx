import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../components/SubscriptionGuard";
import {
    Lock, Camera, Bell, TrendingUp, ChevronLeft, ChevronRight, X,
    Clock, LineChart as LineChartIcon, Calendar, ClipboardList, CircleCheck, AlertTriangle, Info, Siren, CheckCircle2,
} from "lucide-react";
import { StarRating } from "../components/StarRating";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from "recharts";

function Veille() {
    const { user } = useAuth();
    const { isRestricted } = useSubscription();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAsin, setSelectedAsin] = useState("");
    const [selectedCategorie, setSelectedCategorie] = useState("");
    const [chartData, setChartData] = useState([]);
    const [evolutionMsg, setEvolutionMsg] = useState("");
    const [snapshotLoading, setSnapshotLoading] = useState(false);
    const [evolutionLoading, setEvolutionLoading] = useState(false);
    const [produitsPage, setProduitsPage] = useState(1);
    const [alertesDrawerOpen, setAlertesDrawerOpen] = useState(false);
    const [saisonnalite, setSaisonnalite] = useState(null);
    const [saisonnaliteLoading, setSaisonnaliteLoading] = useState(false);
    const [saisonnaliteMsg, setSaisonnaliteMsg] = useState("");

    const PRODUITS_PAGE_SIZE = 10;
    const ALERTES_MAX_INLINE = 3;

    const totalSaisonnaliteObs = (saisonnalite?.months || []).reduce((acc, m) => acc + (m?.count || 0), 0);
    const saisonForce = saisonnalite?.seasonality_strength || 0;
    const saisonPic = saisonnalite?.peak_month;
    const saisonCreux = saisonnalite?.trough_month;

    const saisonConclusion = (() => {
        if (saisonnaliteLoading) return "";
        if (!saisonnalite?.months?.length) return "Pas encore assez d'historique pour conclure.";
        if (totalSaisonnaliteObs < 6) return "Historique trop court: regarde plus de snapshots avant de conclure.";
        if (saisonForce >= 0.6 && saisonPic) return `Forte saisonnalité: augmente le stock autour de M${saisonPic}.`;
        if (saisonForce >= 0.3 && saisonPic && saisonCreux) return `Saisonnalité modérée: stocke davantage en M${saisonPic} (et moins en M${saisonCreux}).`;
        return "Saisonnalité faible: ne pas sur-optimiser le stock sur des mois précis (ou plus d'historique nécessaire).";
    })();

    useEffect(() => {
        if (!user?.id || isRestricted) { setLoading(false); return; }
        fetchVeille();
    }, [user?.id, isRestricted]);

    useEffect(() => {
        setProduitsPage(1);
    }, [data?.produits?.length, user?.id]);

    const chargerEvolution = useCallback(async (asinToLoad, categorieToLoad = "") => {
        if (!asinToLoad || !user?.id) return;
        setEvolutionLoading(true);
        try {
            let url = `/api/amazon/veille/api/evolution/${encodeURIComponent(asinToLoad)}?user_id=${encodeURIComponent(user.id)}`;
            if (categorieToLoad) {
                url += `&categorie=${encodeURIComponent(categorieToLoad)}`;
            }
            const res = await fetch(url, {
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (res.status === 404) {
                setEvolutionMsg("Ce produit n'appartient pas à votre compte ou n'existe pas.");
                setChartData([]);
                return;
            }
            if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
            const evo = await res.json();

            if (!evo.prix?.dates || evo.prix.dates.length === 0) {
                setEvolutionMsg("Aucun historique pour ce produit. Prenez un snapshot d'abord.");
                setChartData([]);
                return;
            }

            setEvolutionMsg("");
            const merged = evo.prix.dates.map((d, i) => ({
                date: d,
                prix: evo.prix.prix?.[i] ?? null,
                note: evo.notes?.notes?.[i] ?? null,
            }));
            setChartData(merged);
        } catch (err) {
            setEvolutionMsg(`Erreur: ${err.message}`);
            setChartData([]);
        } finally {
            setEvolutionLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!selectedAsin || !user?.id) return;
        chargerEvolution(selectedAsin, selectedCategorie);
    }, [selectedAsin, selectedCategorie, user?.id, chargerEvolution]);

    const chargerSaisonnalite = useCallback(async (asinToLoad) => {
        if (!asinToLoad || !user?.id) return;
        setSaisonnaliteLoading(true);
        setSaisonnaliteMsg("");
        try {
            const url = `/api/amazon/veille/api/saisonnalite/${encodeURIComponent(asinToLoad)}?user_id=${encodeURIComponent(user.id)}`;
            const res = await fetch(url, {
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
            const d = await res.json();
            setSaisonnalite(d);
            const totalObs = (d?.months || []).reduce((acc, m) => acc + (m.count || 0), 0);
            if (totalObs < 6) {
                setSaisonnaliteMsg("Saisonnalité: pas assez d'historique (prends des snapshots régulièrement).");
            }
        } catch (err) {
            setSaisonnalite(null);
            setSaisonnaliteMsg(`Saisonnalité indisponible: ${err.message}`);
        } finally {
            setSaisonnaliteLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!selectedAsin || !user?.id) return;
        chargerSaisonnalite(selectedAsin);
    }, [selectedAsin, user?.id, chargerSaisonnalite]);

    const fetchVeille = async () => {
        try {
            let url = `/api/amazon/veille/api/data?user_id=${encodeURIComponent(user.id)}`;
            const res = await fetch(url, {
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
            const veille = await res.json();

            setData(veille);
            setSelectedAsin((prev) => {
                if (veille.produits?.length > 0 && !prev) {
                    setSelectedCategorie(veille.produits[0].categorie || "");
                    return veille.produits[0].asin;
                }
                return prev;
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const enregistrerSnapshot = async () => {
        setSnapshotLoading(true);
        try {
            let url = `/api/amazon/veille/api/snapshot?user_id=${encodeURIComponent(user.id)}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
            const snap = await res.json();
            alert(`Snapshot enregistré : ${snap.date?.substring(0, 16)}`);
            window.location.reload();
        } catch (err) {
            alert(`Erreur : ${err.message}`);
        } finally {
            setSnapshotLoading(false);
        }
    };

    if (isRestricted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 mt-8 max-w-2xl mx-auto">
                <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full flex flex-col items-center">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-5 rounded-full mb-6"><Lock className="w-12 h-12 text-orange-600 dark:text-orange-400" /></div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Veille <span className="text-orange-500">Premium</span></h2>
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
                <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Chargement de la veille…</p>
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

    const alertes = data?.alertes || [];
    const produits = data?.produits || [];
    const produitsTotalPages = Math.max(1, Math.ceil(produits.length / PRODUITS_PAGE_SIZE));
    const produitsPageClamped = Math.min(Math.max(1, produitsPage), produitsTotalPages);
    const produitsOffset = (produitsPageClamped - 1) * PRODUITS_PAGE_SIZE;
    const produitsSlice = produits.slice(produitsOffset, produitsOffset + PRODUITS_PAGE_SIZE);

    const alertesInline = alertes.length > ALERTES_MAX_INLINE ? alertes.slice(0, ALERTES_MAX_INLINE) : alertes;
    const alertesRestantes = alertes.length > ALERTES_MAX_INLINE ? alertes.length - ALERTES_MAX_INLINE : 0;

    const handleAlerteClick = (a) => {
        if (!a.asin) return;
        if (a.asin === selectedAsin && (a.categorie || "") === selectedCategorie) {
            chargerEvolution(a.asin, a.categorie || "");
        } else {
            setSelectedAsin(a.asin);
            setSelectedCategorie(a.categorie || "");
        }
        const el = document.getElementById("evolution-section");
        if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" });
        setAlertesDrawerOpen(false);
    };

    const alerteColorMap = {
        success: "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700",
        danger: "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700",
        warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700",
        info: "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700",
    };
    const AlerteNiveauIcon = ({ niveau }) => {
        const common = "shrink-0 mt-0.5";
        if (niveau === "success") return <CircleCheck size={20} className={`${common} text-green-600 dark:text-green-400`} />;
        if (niveau === "danger") return <Siren size={20} className={`${common} text-red-600 dark:text-red-400`} />;
        if (niveau === "warning") return <AlertTriangle size={20} className={`${common} text-amber-600 dark:text-amber-400`} />;
        return <Info size={20} className={`${common} text-blue-600 dark:text-blue-400`} />;
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 md:p-8 transition-colors">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-gray-300 dark:border-gray-700 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <Bell size={28} className="text-orange-500 shrink-0" />
                             <span className="text-orange-500">Veille</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Surveillance des prix et des notes — alertes automatiques</p>
                    </div>
                    <button
                        onClick={enregistrerSnapshot}
                        disabled={snapshotLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm disabled:opacity-50"
                    >
                        <Camera size={16} /> {snapshotLoading ? "En cours…" : "Snapshot maintenant"}
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
                        <div className="flex justify-center mb-1 text-orange-500"><Camera size={28} /></div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{data?.nb_snapshots || 0}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Snapshots enregistrés</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-yellow-200 dark:border-yellow-700 shadow-sm text-center">
                        <div className="flex justify-center mb-1 text-amber-500"><Clock size={28} /></div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white mt-2">{data?.dernier_snapshot || "—"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Dernier snapshot</div>
                    </div>
                    <div className={`bg-white dark:bg-gray-800 rounded-xl p-5 border shadow-sm text-center ${alertes.length > 0 ? "border-red-200 dark:border-red-700" : "border-green-200 dark:border-green-700"}`}>
                        <div className="flex justify-center mb-1 text-red-500"><Bell size={28} /></div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{alertes.length}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Alertes actives</div>
                    </div>
                </div>

                {/* Alertes */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Bell size={16} /> <Siren size={16} className="text-red-500" /> Alertes de variation</h2>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${alertes.length > 0 ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-green-100 dark:bg-green-900/30 text-green-600"}`}>
                            {alertes.length} alerte(s)
                        </span>
                    </div>
                    <div className="p-4">
                        {alertes.length > 0 ? (
                            <>
                                {alertesInline.map((a, i) => (
                                    <div
                                        key={`alerte-${i}`}
                                        onClick={() => handleAlerteClick(a)}
                                        className={`flex items-start gap-3 p-4 rounded-xl border mb-3 cursor-pointer hover:shadow-md transition-all ${alerteColorMap[a.niveau] || alerteColorMap.info}`}
                                    >
                                        <AlerteNiveauIcon niveau={a.niveau} />
                                        <div className="flex-1">
                                            <strong className="block text-sm text-gray-800 dark:text-gray-200">{a.type}</strong>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{a.produit}{a.categorie ? ` — ${a.categorie}` : ""}</span>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{a.message}</p>
                                        </div>
                                    </div>
                                ))}
                                {alertesRestantes > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setAlertesDrawerOpen(true)}
                                        className="w-full py-2.5 px-3 text-sm font-semibold rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                    >
                                        Voir les {alertesRestantes} autre{alertesRestantes > 1 ? "s" : ""} alerte{alertesRestantes > 1 ? "s" : ""}…
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <span className="flex justify-center mb-3 text-green-500"><CheckCircle2 size={40} strokeWidth={1.25} /></span>
                                <p>Aucune variation significative détectée.</p>
                                <p className="text-xs mt-1">Prenez un premier snapshot pour démarrer le suivi.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Évolution — Graphique */}
                <div id="evolution-section" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><TrendingUp size={16} /> <LineChartIcon size={16} className="text-emerald-500" /> Évolution d'un produit</h2>
                    </div>
                    <div className="p-4">
                        <div className="flex flex-wrap gap-3 items-end mb-4">
                            <div className="flex-1 min-w-[220px]">
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sélectionner un ASIN</label>
                                <select value={`${selectedAsin}||${selectedCategorie}`} onChange={e => {
                                    const [asin, cat] = e.target.value.split("||")
                                    setSelectedAsin(asin);
                                    setSelectedCategorie(cat || "");
                                }} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                                    {(data?.produits || []).map((p, i) => (
                                        <option key={`${p.asin}-${p.categorie}-${i}`} value={`${p.asin}||${p.categorie || ""}`}>{(p.produit || "").slice(0, 40)}… ({p.asin}) [{p.categorie}]</option>
                                    ))}
                                </select>
                            </div>
                            <button type="button" onClick={() => chargerEvolution(selectedAsin, selectedCategorie)} disabled={evolutionLoading || !selectedAsin} className="px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50">Charger</button>
                        </div>

                        {evolutionLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 text-sm">
                                <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent mb-3" />
                                <p>Chargement de l&apos;évolution…</p>
                            </div>
                        ) : chartData.length > 0 ? (
                            <div style={{ width: "100%", height: 300 }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                                        <YAxis yAxisId="prix" orientation="left" tick={{ fontSize: 11, fill: "#f97316" }} label={{ value: "Prix (€)", angle: -90, position: "insideLeft", style: { fill: "#f97316", fontSize: 12 } }} />
                                        <YAxis yAxisId="note" orientation="right" domain={[0, 5]} tick={{ fontSize: 11, fill: "#10b981" }} label={{ value: "Note /5", angle: 90, position: "insideRight", style: { fill: "#10b981", fontSize: 12 } }} />
                                        <Tooltip
                                            contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }}
                                            labelStyle={{ color: "#9ca3af" }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Line yAxisId="prix" type="monotone" dataKey="prix" stroke="#f97316" strokeWidth={2} dot={{ r: 4, fill: "#f97316" }} activeDot={{ r: 6 }} name="Prix (€)" />
                                        <Line yAxisId="note" type="monotone" dataKey="note" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} name="Note /5" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm text-center py-8">
                                {evolutionMsg || (data?.nb_snapshots === 0
                                    ? "Aucun historique disponible. Prenez un snapshot pour commencer le suivi."
                                    : "Sélectionnez un produit et cliquez sur \"Charger\".")}
                            </p>
                        )}
                    </div>
                </div>

                {/* Saisonnalité */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <TrendingUp size={16} /> <Calendar size={16} className="text-cyan-500" /> Saisonnalité (achats/mois)
                        </h2>
                    </div>
                    <div className="p-4">
                        {saisonnaliteLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 text-sm">
                                <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent mb-3" />
                                <p>Calcul de la saisonnalité…</p>
                            </div>
                        ) : (saisonnalite?.months?.length ? (
                            <>
                                <div className="flex flex-wrap gap-3 items-center mb-4">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Force: <span className="font-bold text-gray-700 dark:text-gray-200">{Math.round((saisonnalite.seasonality_strength || 0) * 100)}%</span>
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Pic: <span className="font-bold text-gray-700 dark:text-gray-200">M{saisonnalite.peak_month}</span>
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Creux: <span className="font-bold text-gray-700 dark:text-gray-200">M{saisonnalite.trough_month}</span>
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {saisonnalite.months.map((m) => (
                                        <div key={m.month} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-3">
                                            <div className="text-[11px] text-gray-500 dark:text-gray-400">M{m.month}</div>
                                            <div className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                                                {m.avg_achats_mensuels}
                                            </div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500">
                                                {m.count} obs.
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {saisonnaliteMsg && (
                                    <p className="mt-4 text-xs text-gray-400">{saisonnaliteMsg}</p>
                                )}

                                <div className="mt-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/20 p-4">
                                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                        <div><strong>Force</strong> (0–100%): contraste des mois (plus élevé = saisonnalité plus nette).</div>
                                        <div><strong>Pic / Creux</strong>: mois “meilleur” / “pire” selon la moyenne de achats_mensuels.</div>
                                        <div><strong>obs.</strong>: nombre de snapshots utilisés pour ce mois-là (plus c’est grand, plus c’est fiable).</div>
                                        <div className="mt-2"><strong>Conclusion:</strong> {saisonConclusion}</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-400 text-sm text-center py-8">
                                {saisonnaliteMsg || (data?.nb_snapshots === 0
                                    ? "Aucun historique disponible. Prenez un snapshot pour commencer."
                                    : "Saisonnalité indisponible (prends plus de snapshots).")}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Produits surveillés */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><ClipboardList size={18} className="text-orange-500" /> Produits surveillés</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Produit</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Catégorie</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Prix actuel</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Note</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Avis</th>
                                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Achats/mois</th>
                                </tr>
                            </thead>
                            <tbody>
                                {produitsSlice.map((p, i) => (
                                    <tr key={p.asin || i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 max-w-[220px] text-gray-800 dark:text-gray-200 text-xs">{(p.produit || "").slice(0, 55)}…</td>
                                        <td className="px-4 py-3"><span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5 rounded">{p.categorie}</span></td>
                                        <td className="px-4 py-3 text-orange-600 dark:text-orange-400 font-bold">{p.prix}</td>
                                        <td className="px-4 py-3 text-yellow-500"><span className="inline-flex items-center gap-1"><StarRating note={p.note} size={12} /> {p.note}</span></td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{(p.avis_int || 0).toLocaleString("fr-FR")}</td>
                                        <td className="px-4 py-3">
                                            {p.achats_mensuels > 0
                                                ? <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded">{p.achats_mensuels}+</span>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {produits.length > PRODUITS_PAGE_SIZE && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {produitsOffset + 1}–{Math.min(produitsOffset + PRODUITS_PAGE_SIZE, produits.length)} sur {produits.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={produitsPageClamped <= 1}
                                    onClick={() => setProduitsPage((p) => Math.max(1, p - 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                    <ChevronLeft size={14} /> Précédent
                                </button>
                                <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                                    Page {produitsPageClamped} / {produitsTotalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={produitsPageClamped >= produitsTotalPages}
                                    onClick={() => setProduitsPage((p) => Math.min(produitsTotalPages, p + 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                    Suivant <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {alertesDrawerOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="alertes-drawer-title">
                        <button
                            type="button"
                            className="absolute inset-0 bg-black/40 dark:bg-black/60"
                            aria-label="Fermer"
                            onClick={() => setAlertesDrawerOpen(false)}
                        />
                        <div className="relative h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col">
                            <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
                                <h3 id="alertes-drawer-title" className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                                    <Bell size={16} /> Toutes les alertes ({alertes.length})
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setAlertesDrawerOpen(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                                    aria-label="Fermer le panneau"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {alertes.map((a, i) => (
                                    <div
                                        key={`drawer-alerte-${i}`}
                                        onClick={() => handleAlerteClick(a)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border mb-2 cursor-pointer hover:shadow-md transition-all text-left ${alerteColorMap[a.niveau] || alerteColorMap.info}`}
                                    >
                                        <span className="shrink-0"><AlerteNiveauIcon niveau={a.niveau} /></span>
                                        <div className="flex-1 min-w-0">
                                            <strong className="block text-xs text-gray-800 dark:text-gray-200">{a.type}</strong>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400">{a.produit}{a.categorie ? ` — ${a.categorie}` : ""}</span>
                                            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{a.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Veille;
