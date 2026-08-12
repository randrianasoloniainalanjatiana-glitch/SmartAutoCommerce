import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../components/SubscriptionGuard";
import {
    Lock, Search, Scale, Zap, Trophy, ShoppingBag, Crown, Handshake, ExternalLink, Star, SlidersHorizontal, X, Sparkles, Loader2,
} from "lucide-react";
import { StarRating } from "../components/StarRating";

function Comparateur() {
    const { user } = useAuth();
    const { isRestricted } = useSubscription();

    const [topProduits, setTopProduits] = useState([]);
    const [meilleurParCat, setMeilleurParCat] = useState({});
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtres
    const [categorie, setCategorie] = useState("");
    const [sourceSite, setSourceSite] = useState("");
    const [budget, setBudget] = useState("");
    const [noteMin, setNoteMin] = useState("4");
    const [topN, setTopN] = useState("5");
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Comparaison states
    const [activeTab, setActiveTab] = useState("recommandation");
    const [allProducts, setAllProducts] = useState([]);
    const [search1, setSearch1] = useState("");
    const [search2, setSearch2] = useState("");
    const [selectedProduct1, setSelectedProduct1] = useState(null);
    const [selectedProduct2, setSelectedProduct2] = useState(null);
    const [filterSite1, setFilterSite1] = useState("");
    const [filterSite2, setFilterSite2] = useState("");

    // Analyse IA (OpenAI GPT-4o)
    const [aiLoading, setAiLoading] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiError, setAiError] = useState(null);

    // Chargement initial
    useEffect(() => {
        if (!user?.id || isRestricted) { setLoading(false); return; }
        fetchRecommandations();
    }, [user?.id, isRestricted]);

    const fetchRecommandations = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                note_min: noteMin,
                top_n: topN
            });
            if (categorie) params.append("categorie", categorie);
            if (sourceSite) params.append("source_site", sourceSite);
            if (budget) params.append("budget", budget);
            if (user?.id) params.append("user_id", user.id);

            const res = await fetch(`/api/amazon/comparateur/api/recommander?${params.toString()}`, {
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
            const data = await res.json();
            setTopProduits(Array.isArray(data) ? data : []);

            // Charger les options (catégories, marketplaces, meilleur par cat) via endpoint léger
            const optParams = new URLSearchParams();
            if (user?.id) optParams.append("user_id", user.id);
            const resOpt = await fetch(`/api/amazon/comparateur/api/options?${optParams.toString()}`, {
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (resOpt.ok) {
                const optData = await resOpt.json();
                // allProducts sert pour la comparaison directe : on combine les top produits pour la datalist
                setAllProducts(Array.isArray(data) ? data : []);
                setCategories(optData.categories || []);
                setMeilleurParCat(optData.meilleur_par_categorie || {});
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const FiltersContent = (
        <div className="flex flex-wrap gap-3 items-end">
            <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Catégorie</label>
                <select value={categorie} onChange={e => setCategorie(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 min-w-[140px] w-full">
                    <option value="">Toutes</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Marketplace</label>
                <select value={sourceSite} onChange={e => setSourceSite(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 min-w-[140px] w-full">
                    <option value="">Toutes</option>
                    {[...new Set(allProducts.map(p => p.source_site).filter(Boolean))].sort().map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Budget max (€)</label>
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="ex: 30" className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 w-[160px] max-w-full" />
            </div>
            <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Note min</label>
                <select value={noteMin} onChange={e => setNoteMin(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 w-full">
                    <option value="0">Toutes</option>
                    <option value="4">≥ 4.0 /5</option>
                    <option value="4.3">≥ 4.3 /5</option>
                    <option value="4.5">≥ 4.5 /5</option>
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nb résultats</label>
                <select value={topN} onChange={e => setTopN(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 w-full">
                    <option value="5">Top 5</option>
                    <option value="10">Top 10</option>
                    <option value="20">Top 20</option>
                </select>
            </div>
            <button onClick={fetchRecommandations} className="px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto">
                <Search size={14} /> Recommander
            </button>
        </div>
    );

    const ProductCard = ({ p, badge }) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
            {p.image_url && (
                <div className="h-48 bg-white dark:bg-gray-700 p-3 flex items-center justify-center">
                    <img src={p.image_url} alt="" className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
            )}
            <div className="p-4 flex flex-col flex-grow border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold px-2 py-0.5 rounded">{p.categorie}</span>
                    {p.source_site && <span className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold px-2 py-0.5 rounded">{String(p.source_site).toUpperCase()}</span>}
                    {badge && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded">{badge}</span>}
                </div>
                <h3 className="text-gray-800 dark:text-gray-200 text-sm font-semibold line-clamp-2 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {(p.produit || "").slice(0, 80)}{(p.produit || "").length > 80 ? "…" : ""}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                    <StarRating note={p.note} size={14} />
                    <span className="text-gray-500 dark:text-gray-400 text-xs">{p.note}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">({(p.avis_int || 0).toLocaleString("fr-FR")} avis)</span>
                </div>
                {p.last_bought && <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded mb-2 w-fit">{p.last_bought}</span>}
                {p.score !== undefined && (
                    <div className="mb-2">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all" style={{ width: `${Math.round(p.score || 0)}%` }}></div>
                            </div>
                            <span className="text-orange-500 text-xs font-bold">{p.score}</span>
                        </div>
                        <span className="text-gray-400 text-xs">Score popularité</span>
                    </div>
                )}
                <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{p.prix}</span>
                    <a href={p.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 font-medium rounded-full text-xs border border-[#FCD200] transition-colors">
                        {p.source_site ? String(p.source_site).toUpperCase() : "Ouvrir"} <ExternalLink size={12} />
                    </a>
                </div>
            </div>
        </div>
    );

    useEffect(() => {
        if (search1) {
            const p = allProducts.find(x => x.produit === search1);
            if (p) setSelectedProduct1(p);
        } else {
            setSelectedProduct1(null);
        }
    }, [search1, allProducts]);

    useEffect(() => {
        if (search2) {
            const p = allProducts.find(x => x.produit === search2);
            if (p) setSelectedProduct2(p);
        } else {
            setSelectedProduct2(null);
        }
    }, [search2, allProducts]);

    useEffect(() => {
        setAiAnalysis(null);
        setAiError(null);
    }, [selectedProduct1?.asin, selectedProduct2?.asin]);


    const runAiAnalysis = useCallback(async () => {
        if (!selectedProduct1?.asin || !selectedProduct2?.asin) return;
        setAiLoading(true);
        setAiError(null);
        setAiAnalysis(null);
        try {
            const res = await fetch("/api/amazon/comparateur/api/analyse-ia", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify({
                    asin1: selectedProduct1.asin,
                    asin2: selectedProduct2.asin,
                    user_id: user?.id,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.erreur || data.detail || `Erreur HTTP ${res.status}`);
            }
            setAiAnalysis(data);
        } catch (err) {
            setAiError(err.message || "Impossible de générer le verdict IA.");
        } finally {
            setAiLoading(false);
        }
    }, [selectedProduct1, selectedProduct2, user?.id]);

    useEffect(() => {
        if (!selectedProduct1?.asin || !selectedProduct2?.asin) return undefined;
        const timer = setTimeout(() => {
            void runAiAnalysis();
        }, 600);
        return () => clearTimeout(timer);
    }, [selectedProduct1?.asin, selectedProduct2?.asin, runAiAnalysis]);

    if (isRestricted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 mt-8 max-w-2xl mx-auto">
                <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full flex flex-col items-center">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-5 rounded-full mb-6"><Lock className="w-12 h-12 text-orange-600 dark:text-orange-400" /></div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Comparateur <span className="text-orange-500">Premium</span></h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Réservé aux abonnés actifs.</p>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('show-subscription-modal'))} className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all w-full max-w-sm">ACTIVER MON ABONNEMENT</button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Analyse des recommandations…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto mt-10 p-6 text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
                <h2 className="text-lg font-bold mb-2">Erreur</h2>
                <p className="text-sm">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/50 rounded-md text-sm font-semibold">Réessayer</button>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 md:p-8 transition-colors">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 border-b border-gray-300 dark:border-gray-700 pb-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                                <Scale size={28} className="text-orange-500 shrink-0" />
                                Comparateur & <span className="text-orange-500">Recommandation</span>
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Trouve et compare les meilleurs produits</p>
                        </div>
                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl space-x-1 w-fit">
                            <button 
                                onClick={() => setActiveTab("recommandation")} 
                                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'recommandation' ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                Recommandation
                            </button>
                            <button 
                                onClick={() => setActiveTab("comparaison")} 
                                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'comparaison' ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                Comparaison Directe
                            </button>
                        </div>
                    </div>
                </div>

                {activeTab === 'recommandation' ? (
                    <>
                {/* Desktop: filtres visibles */}
                <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300">
                        <SlidersHorizontal size={16} />
                        <span className="font-semibold text-sm">Filtres</span>
                    </div>
                    {FiltersContent}
                </div>

                {/* Mobile: bouton + drawer */}
                <div className="md:hidden mb-6">
                    <button
                        type="button"
                        onClick={() => setFiltersOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold"
                    >
                        <SlidersHorizontal size={16} /> Filtres
                    </button>
                </div>
                {filtersOpen && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <button
                            type="button"
                            className="absolute inset-0 bg-black/40"
                            aria-label="Fermer les filtres"
                            onClick={() => setFiltersOpen(false)}
                        />
                        <div className="absolute left-0 right-0 bottom-0 mx-auto w-full max-w-xl bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 rounded-t-3xl overflow-hidden">
                            <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                                    <SlidersHorizontal size={18} /> Filtres
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen(false)}
                                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                                    aria-label="Fermer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-4 pb-24 max-h-[80vh] overflow-y-auto">
                                {FiltersContent}
                            </div>
                            <div className="absolute left-0 right-0 bottom-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen(false)}
                                    className="w-full px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black"
                                >
                                    Appliquer
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Recommandations */}
                <div className="mb-8">
                    <h2 className="text-gray-500 dark:text-gray-400 font-semibold text-sm mb-4 flex items-center gap-2"><Zap size={16} className="text-orange-500" /> Top recommandations</h2>
                    {topProduits.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <span className="flex justify-center mb-3"><Search size={40} strokeWidth={1.25} className="opacity-50" /></span>
                            Aucun produit trouvé avec ces critères.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {topProduits.map((p, i) => <ProductCard key={p.asin || i} p={p} />)}
                        </div>
                    )}
                </div>

                {/* Meilleur par catégorie */}
                {Object.keys(meilleurParCat).length > 0 && (
                    <div>
                        <h2 className="text-gray-500 dark:text-gray-400 font-semibold text-sm mb-4 flex items-center gap-2"><Trophy size={16} className="text-amber-500" /> Meilleur produit par catégorie</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {Object.entries(meilleurParCat).map(([cat, p]) => <ProductCard key={cat} p={p} badge="Meilleur" />)}
                        </div>
                    </div>
                )}
                    </>
                ) : (
                    <div className="animate-fade-in">
                        <datalist id="list-product-1">
                            {allProducts.filter(p => !filterSite1 || p.source_site === filterSite1).map((p, idx) => (
                                <option key={`p1-${idx}`} value={p.produit || ''} />
                            ))}
                        </datalist>
                        <datalist id="list-product-2">
                            {allProducts.filter(p => !filterSite2 || p.source_site === filterSite2).map((p, idx) => (
                                <option key={`p2-${idx}`} value={p.produit || ''} />
                            ))}
                        </datalist>

                        <div className="mb-6 flex flex-col items-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Comparez deux produits face à face</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Recherchez ou sélectionnez des produits dans la liste déroulante</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                            {/* VS Badge in the middle (hide on mobile) */}
                            <div className="hidden md:flex absolute top-[150px] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white dark:bg-gray-800 rounded-full items-center justify-center border-4 border-gray-50 dark:border-gray-900 shadow-md">
                                <span className="text-orange-500 font-black italic">VS</span>
                            </div>

                            {/* Product 1 side */}
                            <div className="flex flex-col gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Produit 1</label>
                                    <div className="flex gap-2">
                                        <select 
                                            value={filterSite1} 
                                            onChange={e => {
                                                setFilterSite1(e.target.value);
                                                setSearch1(""); // Reset search when filter changes
                                            }} 
                                            className="px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="">Tous les sites</option>
                                            <option value="amazon">Amazon</option>
                                            <option value="walmart">Walmart</option>
                                            <option value="ebay">eBay</option>
                                        </select>
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Search size={16} className="text-gray-400" />
                                            </div>
                                            <input 
                                                type="text" 
                                                list="list-product-1"
                                                value={search1}
                                                onChange={e => setSearch1(e.target.value)}
                                                placeholder="Saisissez ou choisissez un produit..." 
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {selectedProduct1 ? (
                                    <div className="transform transition-all">
                                        <ProductCard p={selectedProduct1} badge="Produit 1" />
                                        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-sm">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <span className="text-gray-500 dark:text-gray-400">Prix</span>
                                                <span className="font-semibold text-right text-gray-900 dark:text-white">{selectedProduct1.prix || '-'}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <span className="text-gray-500 dark:text-gray-400">Note</span>
                                                <span className="font-semibold text-right text-yellow-500 inline-flex items-center justify-end gap-1">{selectedProduct1.note || '-'} <Star size={14} className="fill-yellow-500 text-yellow-500" /></span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <span className="text-gray-500 dark:text-gray-400">Avis</span>
                                                <span className="font-semibold text-right text-gray-900 dark:text-white">{(selectedProduct1.avis_int || 0).toLocaleString("fr-FR")}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <span className="text-gray-500 dark:text-gray-400">Score</span>
                                                <span className="font-semibold text-right text-orange-500">{selectedProduct1.score || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                                        <ShoppingBag size={40} strokeWidth={1.25} className="mb-2 opacity-50 text-gray-400" />
                                        <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Sélectionnez le produit 1</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Produit 2</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={filterSite2}
                                            onChange={e => {
                                                setFilterSite2(e.target.value);
                                                setSearch2("");
                                            }}
                                            className="px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="">Tous les sites</option>
                                            <option value="amazon">Amazon</option>
                                            <option value="walmart">Walmart</option>
                                            <option value="ebay">eBay</option>
                                        </select>
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Search size={16} className="text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                list="list-product-2"
                                                value={search2}
                                                onChange={e => setSearch2(e.target.value)}
                                                placeholder="Saisissez ou choisissez un produit..."
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {selectedProduct2 ? (
                                    <div className="transform transition-all">
                                        <ProductCard p={selectedProduct2} badge="Produit 2" />
                                        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-sm">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <span className="text-gray-500 dark:text-gray-400">Prix</span>
                                                <span className="font-semibold text-right text-gray-900 dark:text-white">{selectedProduct2.prix || "-"}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <span className="text-gray-500 dark:text-gray-400">Note</span>
                                                <span className="font-semibold text-right text-yellow-500 inline-flex items-center justify-end gap-1">{selectedProduct2.note || "-"} <Star size={14} className="fill-yellow-500 text-yellow-500" /></span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <span className="text-gray-500 dark:text-gray-400">Avis</span>
                                                <span className="font-semibold text-right text-gray-900 dark:text-white">{(selectedProduct2.avis_int || 0).toLocaleString("fr-FR")}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <span className="text-gray-500 dark:text-gray-400">Score</span>
                                                <span className="font-semibold text-right text-orange-500">{selectedProduct2.score || "-"}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                                        <ShoppingBag size={40} strokeWidth={1.25} className="mb-2 opacity-50 text-gray-400" />
                                        <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Sélectionnez le produit 2</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedProduct1 && selectedProduct2 && (
                                <div className="mt-8 space-y-4">
                                    {aiLoading && (
                                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white text-center shadow-lg">
                                            <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
                                                <Loader2 size={22} className="animate-spin" /> Verdict de la comparaison
                                            </h3>
                                            <p className="opacity-90 text-sm">Génération du verdict par l&apos;IA (GPT-4o)…</p>
                                        </div>
                                    )}
                                    {aiError && !aiLoading && (
                                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm text-center">
                                            {aiError}
                                            <button type="button" onClick={runAiAnalysis} className="mt-3 block mx-auto px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Réessayer</button>
                                        </div>
                                    )}
                                    {aiAnalysis && !aiAnalysis.erreur && !aiLoading && (
                                        <>
                                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white text-center shadow-lg">
                                                <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                                                    <h3 className="text-xl font-bold">Verdict de la comparaison</h3>
                                                    <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles size={12} /> IA GPT-4o</span>
                                                    {aiAnalysis.score_confiance != null && (
                                                        <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">Confiance {aiAnalysis.score_confiance}%</span>
                                                    )}
                                                </div>
                                                <p className="opacity-95 flex items-start justify-center gap-2 text-left max-w-3xl mx-auto">
                                                    {aiAnalysis.verdict === "equilibre" ? <Handshake size={22} className="shrink-0 mt-0.5" /> : <Crown size={22} className="shrink-0 mt-0.5" />}
                                                    <span>{aiAnalysis.verdict_texte || aiAnalysis.recommandation || aiAnalysis.resume}</span>
                                                </p>
                                                {aiAnalysis.gagnant_label && (
                                                    <p className="mt-3 text-sm font-semibold opacity-90">Choix recommandé : {aiAnalysis.gagnant_label}</p>
                                                )}
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                                                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Détails de l&apos;analyse</span>
                                                    <button type="button" onClick={runAiAnalysis} disabled={aiLoading} className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50">Regénérer</button>
                                                </div>
                                                <div className="p-5 space-y-4 text-sm text-gray-700 dark:text-gray-300">
                                                    {aiAnalysis.resume && <p className="leading-relaxed">{aiAnalysis.resume}</p>}
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        {Array.isArray(aiAnalysis.points_forts_produit_1) && aiAnalysis.points_forts_produit_1.length > 0 && (
                                                            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 border border-gray-100 dark:border-gray-700">
                                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Points forts — {String(selectedProduct1?.source_site || "P1").toUpperCase()}</h4>
                                                                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                                                                    {aiAnalysis.points_forts_produit_1.map((pt, i) => <li key={`p1-${i}`}>{pt}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {Array.isArray(aiAnalysis.points_forts_produit_2) && aiAnalysis.points_forts_produit_2.length > 0 && (
                                                            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 border border-gray-100 dark:border-gray-700">
                                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Points forts — {String(selectedProduct2?.source_site || "P2").toUpperCase()}</h4>
                                                                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                                                                    {aiAnalysis.points_forts_produit_2.map((pt, i) => <li key={`p2-${i}`}>{pt}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {Array.isArray(aiAnalysis.risques) && aiAnalysis.risques.length > 0 && (
                                                        <div>
                                                            <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">Risques</h4>
                                                            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                                                                {aiAnalysis.risques.map((r, i) => <li key={`r-${i}`}>{r}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Comparateur;
