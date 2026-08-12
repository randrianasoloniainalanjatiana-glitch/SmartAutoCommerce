import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../components/SubscriptionGuard";
import { Lock, Search, SlidersHorizontal, Grid3X3, List, Download, ClipboardList, ExternalLink, X } from "lucide-react";
import { StarRating } from "../components/StarRating";
import { FLASK_API } from "../config/apiConfig";

const API_BASE = `${FLASK_API}/catalogue`;

function Catalogue() {
    const { user } = useAuth();
    const { isRestricted } = useSubscription();

    const [produits, setProduits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState("grid");

    // Filtres
    const [categorie, setCategorie] = useState("");
    const [recherche, setRecherche] = useState("");
    const [noteMin, setNoteMin] = useState("0");
    const [prixMax, setPrixMax] = useState("");
    const [tri, setTri] = useState("note");
    const [sourceSite, setSourceSite] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    const fetchCatalogue = useCallback(async () => {
        if (!user?.id || isRestricted) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (categorie) params.set("categorie", categorie);
            if (recherche) params.set("q", recherche);
            if (noteMin && noteMin !== "0") params.set("note_min", noteMin);
            if (prixMax) params.set("prix_max", prixMax);
            if (tri) params.set("tri", tri);

            const res = await fetch(`${API_BASE}/?${params.toString()}`, {
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
            const html = await res.text();

            // Parse the JSON data from the page context — we use the API endpoint instead
            // Since Flask renders HTML, we call a dedicated JSON endpoint
            // Let's fetch from the catalogue page and parse data
            // Actually, we need a JSON API. Let's create a workaround by calling the comparateur-style API
            // For now, let's use the catalogue service which returns HTML. We'll add a JSON API route.
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user?.id, isRestricted, categorie, recherche, noteMin, prixMax, tri]);

    useEffect(() => {
        const loadData = async () => {
            if (!user?.id || isRestricted) { setLoading(false); return; }
            try {
                // Fetch catalogue via API JSON
                const params = new URLSearchParams();
                params.set("user_id", user.id);
                if (categorie) params.set("categorie", categorie);
                if (recherche) params.set("q", recherche);
                if (noteMin && noteMin !== "0") params.set("note_min", noteMin);
                if (prixMax) params.set("prix_max", prixMax);
                if (tri) params.set("tri", tri);
                if (sourceSite) params.set("source_site", sourceSite);
                params.set("page", page);
                params.set("limit", 20);

                const res = await fetch(`${API_BASE}/?${params.toString()}`, {
                    headers: { "ngrok-skip-browser-warning": "true" },
                });
                if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
                const data = await res.json();

                // Extract categories from API response
                setCategories(data.categories || []);
                setProduits(data.produits || []);
                setTotalPages(data.total_pages || 1);
                setTotalResults(data.nb_resultats || 0);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user?.id, isRestricted, categorie, sourceSite, recherche, noteMin, prixMax, tri, page]);

    // Réinitialiser la page quand un filtre change
    useEffect(() => {
        setPage(1);
    }, [categorie, sourceSite, recherche, noteMin, prixMax, tri]);

    const handleReset = () => {
        setCategorie(""); setSourceSite(""); setRecherche(""); setNoteMin("0"); setPrixMax(""); setTri("note"); setPage(1);
    };

    const handleExport = (type) => {
        let url = `${API_BASE}/export/${type}`;
        const params = new URLSearchParams();
        if (user?.id) params.set("user_id", user.id);
        if (sourceSite) params.set("source_site", sourceSite);
        if (params.toString()) url += `?${params.toString()}`;
        window.open(url, "_blank");
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
                    {[...new Set(produits.map(p => p.source_site).filter(Boolean))].sort().map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </select>
            </div>
            <div className="min-w-[180px]">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Recherche</label>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Mot-clé…" className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300" />
                </div>
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
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Prix max (€)</label>
                <input type="number" value={prixMax} onChange={e => setPrixMax(e.target.value)} placeholder="ex: 50" className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 w-[140px] max-w-full" />
            </div>
            <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Trier par</label>
                <select value={tri} onChange={e => setTri(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 w-full">
                    <option value="note">Note</option>
                    <option value="prix">Prix</option>
                    <option value="avis">Avis</option>
                    <option value="nom">Nom</option>
                </select>
            </div>
            <button onClick={handleReset} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors w-full sm:w-auto">Réinitialiser</button>
        </div>
    );

    if (isRestricted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 mt-8 max-w-2xl mx-auto">
                <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full flex flex-col items-center">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-5 rounded-full mb-6 relative">
                        <Lock className="w-12 h-12 text-orange-600 dark:text-orange-400 relative z-10" />
                        <div className="absolute inset-0 bg-orange-400 opacity-20 blur-xl rounded-full"></div>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Catalogue <span className="text-orange-500">Premium</span></h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md font-medium">
                        L'accès au catalogue de produits est réservé aux abonnés actifs.
                    </p>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('show-subscription-modal'))}
                        className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black rounded-xl shadow-[0_10px_30px_rgba(249,115,22,0.3)] hover:shadow-[0_15px_40px_rgba(249,115,22,0.4)] transition-all transform hover:-translate-y-1 w-full max-w-sm"
                    >
                        ACTIVER MON ABONNEMENT
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                <p className="ml-3 mt-4 text-gray-600 dark:text-gray-400 font-medium">Chargement du catalogue…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto mt-10 p-6 text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
                <h2 className="text-lg font-bold mb-2">Erreur</h2>
                <p className="text-sm opacity-90">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-800 dark:text-red-400 rounded-md text-sm font-semibold transition-colors">Réessayer</button>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 md:p-8 transition-colors">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-gray-300 dark:border-gray-700 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <ClipboardList size={28} className="text-orange-500 shrink-0" />
                            Catalogue <span className="text-orange-500">Produits</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{totalResults} produit(s) trouvé(s)</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleExport("json")} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <Download size={14} /> JSON
                        </button>
                        <button onClick={() => handleExport("csv")} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <Download size={14} /> CSV
                        </button>
                    </div>
                </div>

                {/* Filters */}
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
                            <div className="absolute left-0 right-0 bottom-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-800 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { handleReset(); }}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold"
                                >
                                    Réinitialiser
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black"
                                >
                                    Appliquer
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View toggle */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{totalResults > 0 ? `Affichage de ${(page - 1) * 20 + 1} à ${Math.min(page * 20, totalResults)} sur ${totalResults}` : "Aucun résultat"}</span>
                    <div className="flex gap-1">
                        <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-orange-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}><Grid3X3 size={16} /></button>
                        <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-orange-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}><List size={16} /></button>
                    </div>
                </div>

                {/* Grid View */}
                {viewMode === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {produits.length === 0 ? (
                            <div className="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
                                <span className="flex justify-center mb-3"><Search size={40} strokeWidth={1.25} className="opacity-50" /></span>
                                Aucun produit ne correspond à ces critères.
                            </div>
                        ) : produits.map((p, i) => (
                            <div key={p.asin || i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col group">
                                {p.image_url && (
                                    <div className="relative h-56 bg-white dark:bg-gray-700 p-4 flex items-center justify-center">
                                        <img src={p.image_url} alt="" className="max-w-full max-h-full object-contain transform group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                    </div>
                                )}
                                <div className="p-4 flex flex-col flex-grow border-t border-gray-50 dark:border-gray-700">
                                    <div className="flex gap-2 mb-2 flex-wrap">
                                        {p.categorie && <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold px-2 py-0.5 rounded w-fit">{p.categorie}</span>}
                                        {p.source_site && <span className="inline-block bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold px-2 py-0.5 rounded w-fit">{String(p.source_site).toUpperCase()}</span>}
                                    </div>
                                    <h3 className="text-gray-800 dark:text-gray-200 text-sm font-semibold line-clamp-2 h-10 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                        {(p.produit || "").slice(0, 80)}{(p.produit || "").length > 80 ? "…" : ""}
                                    </h3>
                                    <div className="flex items-center mb-3 gap-2">
                                        <StarRating note={p.note} size={14} />
                                        <span className="text-gray-500 dark:text-gray-400 text-xs">({(p.avis_int || 0).toLocaleString("fr-FR")} avis)</span>
                                    </div>
                                    {p.last_bought && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded mb-2 w-fit">{p.last_bought}</span>}
                                    <div className="mt-auto">
                                        <div className="flex items-baseline gap-1 mb-4">
                                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{p.prix}</span>
                                        </div>
                                        <a href={p.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 w-full text-center bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 font-medium py-2 rounded-full shadow-sm border border-[#FCD200] transition-colors duration-200 text-sm">
                                            {p.source_site ? String(p.source_site).toUpperCase() : "Ouvrir"} <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                        <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Image</th>
                                        <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Produit</th>
                                        <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Catégorie</th>
                                        <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Prix</th>
                                        <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Note</th>
                                        <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Avis</th>
                                        <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Lien</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {produits.map((p, i) => (
                                        <tr key={p.asin || i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3">{p.image_url && <img src={p.image_url} alt="" className="w-12 h-12 object-contain rounded" />}</td>
                                            <td className="px-4 py-3 max-w-[220px] text-gray-800 dark:text-gray-200 text-xs">{(p.produit || "").slice(0, 60)}…</td>
                                            <td className="px-4 py-3"><span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5 rounded">{p.categorie}</span></td>
                                            <td className="px-4 py-3 text-orange-600 dark:text-orange-400 font-bold">{p.prix}</td>
                                            <td className="px-4 py-3 text-yellow-500"><span className="inline-flex items-center gap-1"><StarRating note={p.note} size={12} /> {p.note}</span></td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{(p.avis_int || 0).toLocaleString("fr-FR")}</td>
                                            <td className="px-4 py-3"><a href={p.lien} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex" aria-label="Ouvrir le lien"><ExternalLink size={14} /></a></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button 
                            disabled={page <= 1} 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Précédent
                        </button>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Page {page} sur {totalPages}
                        </span>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Suivant
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Catalogue;
