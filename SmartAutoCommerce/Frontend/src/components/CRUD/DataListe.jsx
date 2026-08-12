import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { DJANGO_API } from '../../config/apiConfig';
import { ArrowDown, ArrowUp, ArrowUpDown, Trash2, RotateCcw, Pencil, Megaphone } from 'lucide-react';
import AddProduct from './AddProduct';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

const WEBHOOK_PRODUCT_N8N = 'https://n8n.projets-omega.net/webhook-test/01b114cd-e0a5-4f1f-b077-16781ed724a7';

const DataList = () => {
  const { user } = useAuth();
  const { currentSymbol } = useSettings();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState('active');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);
  const [pendingPermanentDeleteIds, setPendingPermanentDeleteIds] = useState([]);
  const [detailsEditMode, setDetailsEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [showRepublishInvite, setShowRepublishInvite] = useState(false);
  const [republishProductId, setRepublishProductId] = useState(null);
  const [republishSending, setRepublishSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(`${DJANGO_API}/data/`);
        if (response.data) {
          const userProducts = response.data.filter(item => item.id_utilisateur === user.id);
          setItems(userProducts);
        }
      } catch (error) {
        console.error("Erreur Django/CORS:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleProductAdded = (newProduct) => {
    const productWithUser = {
      id: newProduct.id || Date.now(),
      name: newProduct.name,
      price: newProduct.price,
      stock_quantity: newProduct.stock_quantity,
      description: newProduct.description,
      category: newProduct.category || null,
      image_urls: newProduct.image_urls || null,
      is_published: newProduct.is_published || true,
      id_utilisateur: user.id,
      est_supprime: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (productWithUser.id_utilisateur === user.id) {
      setItems((prevItems) => [productWithUser, ...prevItems]);
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedItems = useMemo(() => {
    const visibleItems = items.filter((item) => {
      const isDeleted = item.est_supprime === true || item['est_supprimé'] === true;
      return viewMode === 'trash' ? isDeleted : !isDeleted;
    });

    let filteredItems = [...visibleItems];
    if (searchQuery) {
      filteredItems = filteredItems.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortConfig.key !== null) {
      filteredItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filteredItems;
  }, [items, sortConfig, searchQuery, viewMode]);

  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [viewMode, searchQuery, rowsPerPage]);

  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredAndSortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedItems.length / rowsPerPage);

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return <ArrowUpDown size={14} className="inline opacity-40" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="inline" /> : <ArrowDown size={14} className="inline" />;
  };

  const handleProductClick = (product) => {
    setDetailsEditMode(false);
    setEditForm(null);
    setSelectedProduct(product);
    setShowDetails(true);
  };

  const closeDetails = (options = {}) => {
    const skipRepublishWebhook = !!options.skipRepublishWebhook;
    if (!skipRepublishWebhook && showRepublishInvite && republishProductId != null && user?.id) {
      void axios
        .post(WEBHOOK_PRODUCT_N8N, {
          id: republishProductId,
          id_utilisateur: user.id,
          action: 'annulé',
        })
        .catch((err) => console.error('Erreur webhook republication (annulé):', err));
    }
    setShowDetails(false);
    setSelectedProduct(null);
    setDetailsEditMode(false);
    setEditForm(null);
    setShowRepublishInvite(false);
    setRepublishProductId(null);
  };

  const clearRepublishInviteState = () => {
    setShowRepublishInvite(false);
    setRepublishProductId(null);
  };

  const handleRepublishDismiss = async () => {
    if (republishProductId == null || !user?.id) {
      clearRepublishInviteState();
      return;
    }
    setRepublishSending(true);
    try {
      await axios.post(WEBHOOK_PRODUCT_N8N, {
        id: republishProductId,
        id_utilisateur: user.id,
        action: 'annulé',
      });
    } catch (error) {
      console.error('Erreur webhook republication (annulé):', error);
    } finally {
      clearRepublishInviteState();
      setRepublishSending(false);
    }
  };

  const handleRepublishConfirm = async () => {
    if (republishProductId == null || !user?.id) return;
    setRepublishSending(true);
    try {
      await axios.post(WEBHOOK_PRODUCT_N8N, {
        id: republishProductId,
        id_utilisateur: user.id,
        action: 'confirmer',
      });
      clearRepublishInviteState();
    } catch (error) {
      console.error('Erreur webhook republication (confirmer):', error);
    } finally {
      setRepublishSending(false);
    }
  };

  const startDetailsEdit = () => {
    if (!selectedProduct) return;
    setEditForm({
      name: selectedProduct.name ?? '',
      category: selectedProduct.category ?? '',
      price: selectedProduct.price ?? '',
      stock_quantity: selectedProduct.stock_quantity ?? '',
      description: selectedProduct.description ?? '',
      is_published: !!selectedProduct.is_published,
    });
    setDetailsEditMode(true);
  };

  const cancelDetailsEdit = () => {
    setDetailsEditMode(false);
    setEditForm(null);
  };

  const isDetailsEditDirty = useMemo(() => {
    if (!detailsEditMode || !editForm || !selectedProduct) return false;
    const p = selectedProduct;
    const f = editForm;
    const t = (v) => (v == null ? '' : String(v)).trim();
    const numEq = (a, b) => {
      const na = a === '' || a == null ? NaN : Number(a);
      const nb = b === '' || b == null ? NaN : Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
      return t(a) === t(b);
    };
    return !(
      t(f.name) === t(p.name) &&
      t(f.category) === t(p.category ?? '') &&
      numEq(f.price, p.price) &&
      numEq(f.stock_quantity, p.stock_quantity) &&
      t(f.description) === t(p.description ?? '') &&
      !!f.is_published === !!p.is_published
    );
  }, [detailsEditMode, editForm, selectedProduct]);

  const saveProductDetails = async () => {
    if (!selectedProduct || !editForm || !isDetailsEditDirty) return;
    const id = selectedProduct.id;
    const updatedAt = new Date().toISOString();
    const priceVal = editForm.price === '' ? null : Number(editForm.price);
    const stockVal = editForm.stock_quantity === '' ? 0 : Number(editForm.stock_quantity);
    const payload = {
      name: editForm.name.trim() || selectedProduct.name,
      category: editForm.category?.trim() || null,
      price: Number.isFinite(priceVal) ? priceVal : selectedProduct.price,
      stock_quantity: Number.isFinite(stockVal) ? stockVal : selectedProduct.stock_quantity,
      description: editForm.description?.trim() || null,
      is_published: editForm.is_published,
      updated_at: updatedAt,
    };
    setDetailsSaving(true);
    try {
      await axios.put(`${DJANGO_API}/data/${id}/`, payload);
      const merged = { ...selectedProduct, ...payload };
      setSelectedProduct(merged);
      setItems((prev) => prev.map((item) => (item.id === id ? merged : item)));
      setDetailsEditMode(false);
      setEditForm(null);
      setRepublishProductId(merged.id);
      setShowRepublishInvite(true);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
    } finally {
      setDetailsSaving(false);
    }
  };

  const updateProductSoftDelete = async (productId, isDeleted) => {
    const url = `${DJANGO_API}/data/${productId}/`;
    const updatedAt = new Date().toISOString();
    try {
      await axios.put(url, {
        'est_supprimé': isDeleted,
        updated_at: updatedAt,
      });
    } catch (firstError) {
      await axios.put(url, {
        est_supprime: isDeleted,
        updated_at: updatedAt,
      });
      if (firstError) {
        // fallback handled above
      }
    }
  };

  const handleSoftDelete = async (productId) => {
    try {
      await updateProductSoftDelete(productId, true);
      setItems((prev) => prev.map((item) => (
        item.id === productId ? { ...item, est_supprime: true, 'est_supprimé': true, updated_at: new Date().toISOString() } : item
      )));
      setSelectedIds((prev) => prev.filter((id) => id !== productId));
    } catch (error) {
      console.error("Erreur lors de la suppression logique:", error);
    }
  };

  const handleRestore = async (productId) => {
    try {
      await updateProductSoftDelete(productId, false);
      setItems((prev) => prev.map((item) => (
        item.id === productId ? { ...item, est_supprime: false, 'est_supprimé': false, updated_at: new Date().toISOString() } : item
      )));
      setSelectedIds((prev) => prev.filter((id) => id !== productId));
    } catch (error) {
      console.error("Erreur lors de la restauration:", error);
    }
  };

  const openPermanentDeleteConfirm = (ids) => {
    if (!ids?.length) return;
    setPendingPermanentDeleteIds(ids);
    setShowPermanentDeleteConfirm(true);
  };

  const closePermanentDeleteConfirm = () => {
    setShowPermanentDeleteConfirm(false);
    setPendingPermanentDeleteIds([]);
  };

  /** Même webhook que republication : un POST par id, champs id + id_utilisateur + action. */
  const notifyPermanentDeleteWebhook = async (deletedIds) => {
    if (!user?.id || !deletedIds?.length) {
      if (!user?.id) console.warn('Webhook suppression définitive ignoré : utilisateur non connecté.');
      return;
    }
    const uid = user.id;
    const headers = { 'Content-Type': 'application/json' };
    try {
      await Promise.all(
        deletedIds.map((pid) =>
          axios.post(
            WEBHOOK_PRODUCT_N8N,
            { id: pid, id_utilisateur: uid, action: 'supprimé' },
            { headers },
          ),
        ),
      );
    } catch (error) {
      console.error('Erreur webhook suppression définitive (n8n):', error);
    }
  };

  const confirmPermanentDelete = async () => {
    const ids = [...pendingPermanentDeleteIds];
    if (!ids.length) {
      closePermanentDeleteConfirm();
      return;
    }
    const idSet = new Set(ids.map(String));
    try {
      const uid = user?.id;
      await Promise.all(
        ids.map((id) => {
          const q = uid != null ? `?id_utilisateur=${encodeURIComponent(String(uid))}` : '';
          return axios.delete(`${DJANGO_API}/data/${encodeURIComponent(String(id))}/${q}`);
        }),
      );
      await notifyPermanentDeleteWebhook(ids);
      setItems((prev) => prev.filter((item) => !idSet.has(String(item.id))));
      setSelectedIds((prev) => prev.filter((sid) => !idSet.has(String(sid))));
      if (selectedProduct && idSet.has(String(selectedProduct.id))) {
        closeDetails({ skipRepublishWebhook: true });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression définitive:', error);
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        'Suppression impossible. Vérifiez la console ou que le backend Supabase autorise le DELETE.';
      alert(msg);
    } finally {
      closePermanentDeleteConfirm();
    }
  };

  const requestBulkPermanentDelete = () => {
    if (selectedIds.length === 0) return;
    openPermanentDeleteConfirm([...selectedIds]);
  };

  const handleSelectItem = (productId, checked) => {
    setSelectedIds((prev) => {
      if (checked) return [...new Set([...prev, productId])];
      return prev.filter((id) => id !== productId);
    });
  };

  const handleSelectAllCurrentPage = (checked) => {
    if (checked) {
      const pageIds = currentItems.map((item) => item.id);
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
      return;
    }
    const pageIds = new Set(currentItems.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
  };

  const areAllCurrentSelected = currentItems.length > 0 && currentItems.every((item) => selectedIds.includes(item.id));

  const handleBulkSoftDelete = async () => {
    try {
      const results = await Promise.allSettled(selectedIds.map((id) => updateProductSoftDelete(id, true)));
      const successIds = selectedIds.filter((_, index) => results[index].status === 'fulfilled');
      setItems((prev) => prev.map((item) => (
        successIds.includes(item.id) ? { ...item, est_supprime: true, 'est_supprimé': true, updated_at: new Date().toISOString() } : item
      )));
      setSelectedIds((prev) => prev.filter((id) => !successIds.includes(id)));
    } catch (error) {
      console.error("Erreur suppression multiple:", error);
    }
  };

  const handleBulkRestore = async () => {
    try {
      const results = await Promise.allSettled(selectedIds.map((id) => updateProductSoftDelete(id, false)));
      const successIds = selectedIds.filter((_, index) => results[index].status === 'fulfilled');
      setItems((prev) => prev.map((item) => (
        successIds.includes(item.id) ? { ...item, est_supprime: false, 'est_supprimé': false, updated_at: new Date().toISOString() } : item
      )));
      setSelectedIds((prev) => prev.filter((id) => !successIds.includes(id)));
    } catch (error) {
      console.error("Erreur restauration multiple:", error);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">

        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">LISTE DES  PRODUITS</h1>
            {viewMode === 'active' && <AddProduct onProductAdded={handleProductAdded} />}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('active')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                viewMode === 'active'
                  ? 'bg-cyan-500 text-white border-cyan-500'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              Produits
            </button>
            <button
              onClick={() => setViewMode('trash')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                viewMode === 'trash'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              Corbeille
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Rechercher par nom, description ou catégorie..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-80 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Lignes :</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-transparent font-bold outline-none cursor-pointer dark:text-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{selectedIds.length} sélectionné(s)</span>
            {viewMode === 'active' ? (
              <button
                onClick={handleBulkSoftDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 size={13} />
                Supprimer sélection
              </button>
            ) : (
              <>
                <button
                  onClick={handleBulkRestore}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  <RotateCcw size={13} />
                  Restaurer sélection
                </button>
                <button
                  onClick={requestBulkPermanentDelete}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={13} />
                  Supprimer définitivement
                </button>
              </>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={areAllCurrentSelected}
                    onChange={(e) => handleSelectAllCurrentPage(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500"
                  />
                </th>
                <th onClick={() => requestSort('name')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none">Produit {getSortIcon('name')}</th>
                <th onClick={() => requestSort('category')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-center">Catégorie {getSortIcon('category')}</th>
                <th onClick={() => requestSort('price')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-right">Prix {getSortIcon('price')}</th>
                <th onClick={() => requestSort('stock_quantity')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-center">Stock {getSortIcon('stock_quantity')}</th>
                <th onClick={() => requestSort('is_published')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-center">Statut {getSortIcon('is_published')}</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {currentItems.length > 0 ? currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer" onClick={() => handleProductClick(item)}>
                  <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 mr-4 shadow-sm">
                        {item.image_urls ? (
                          <img src={item.image_urls} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[9px] text-gray-400 font-bold uppercase">Image</div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-50 italic">{item.description?.substring(0, 50)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">{item.category || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">{item.price} {currentSymbol}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold ${item.stock_quantity < 5 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{item.stock_quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${item.is_published ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600'}`}>
                      {item.is_published ? 'ACTIF' : 'INACTIF'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {viewMode === 'active' ? (
                      <button
                        onClick={() => handleSoftDelete(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                      >
                        <Trash2 size={13} />
                        Supprimer
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleRestore(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                        >
                          <RotateCcw size={13} />
                          Restaurer
                        </button>
                        <button
                          onClick={() => openPermanentDeleteConfirm([item.id])}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                        >
                          <Trash2 size={13} />
                          Définitif
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">{searchQuery ? 'Aucun résultat trouvé' : viewMode === 'trash' ? 'Corbeille vide' : 'Aucune donnée disponible'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 font-medium italic">
            Affichage {filteredAndSortedItems.length > 0 ? indexOfFirstItem + 1 : 0} à {Math.min(indexOfLastItem, filteredAndSortedItems.length)} sur {filteredAndSortedItems.length} entrées
          </p>
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-all">PRÉCÉDENT</button>
            <div className="flex gap-1 px-4 text-xs font-black text-gray-500 dark:text-gray-400">{currentPage} / {totalPages || 1}</div>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-all">SUIVANT</button>
          </div>
        </div>
      </div>

      {/* Popup Détails Produit */}
      {showDetails && selectedProduct && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center p-4 z-50" onClick={detailsSaving ? undefined : closeDetails}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Détails du Produit</h2>
                <div className="flex items-center gap-2">
                  {detailsEditMode ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelDetailsEdit}
                        disabled={detailsSaving}
                        className="px-3 py-2 rounded-lg text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={saveProductDetails}
                        disabled={detailsSaving || !isDetailsEditDirty}
                        className="px-3 py-2 rounded-lg text-sm font-bold bg-cyan-500 text-white hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {detailsSaving ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startDetailsEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                    >
                      <Pencil size={16} />
                      Modifier
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeDetails}
                    disabled={detailsSaving}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 p-1"
                    aria-label="Fermer"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-48 h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                    {selectedProduct.image_urls ? (
                      <img src={selectedProduct.image_urls} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">Aucune image</span>
                      </div>
                    )}
                  </div>
                </div>

                {detailsEditMode && editForm ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Nom du produit</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Catégorie</label>
                        <input
                          type="text"
                          value={editForm.category}
                          onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Prix ({currentSymbol})</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={editForm.price}
                          onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Stock</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={editForm.stock_quantity}
                          onChange={(e) => setEditForm((f) => ({ ...f, stock_quantity: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y min-h-[100px]"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={editForm.is_published}
                          onChange={(e) => setEditForm((f) => ({ ...f, is_published: e.target.checked }))}
                          className="w-4 h-4 accent-cyan-500 rounded"
                        />
                        Produit publié (visible / actif)
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Nom du produit</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProduct.name}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Catégorie</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProduct.category || 'Non définie'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Prix</label>
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{selectedProduct.price} {currentSymbol}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Stock</label>
                        <p className={`text-lg font-bold ${selectedProduct.stock_quantity < 5 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                          {selectedProduct.stock_quantity} unités
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Description</label>
                      <p className="text-gray-700 dark:text-gray-300 mt-1">
                        {selectedProduct.description || 'Aucune description disponible'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Statut</label>
                      <div className="mt-1">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${selectedProduct.is_published
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600'
                          }`}>
                          {selectedProduct.is_published ? 'ACTIF' : 'INACTIF'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="text-gray-500 dark:text-gray-400">Créé le</label>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedProduct.created_at
                        ? new Date(selectedProduct.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400">Modifié le</label>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedProduct.updated_at
                        ? new Date(selectedProduct.updated_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression définitive (même style que déconnexion — headbar) */}
      {showPermanentDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closePermanentDeleteConfirm}
            aria-hidden
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Suppression définitive</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              {pendingPermanentDeleteIds.length <= 1
                ? 'Êtes-vous sûr de vouloir supprimer définitivement ce produit ? Cette action est irréversible : les données seront effacées et ne pourront pas être récupérées.'
                : `Êtes-vous sûr de vouloir supprimer définitivement ces ${pendingPermanentDeleteIds.length} produits ? Cette action est irréversible : les données seront effacées et ne pourront pas être récupérées.`}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closePermanentDeleteConfirm}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmPermanentDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-100 dark:shadow-none"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation à republier après modification (webhook n8n) */}
      {showRepublishInvite && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={republishSending ? undefined : handleRepublishDismiss}
            aria-hidden
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <Megaphone size={28} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Republier le produit ?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Vos modifications ont été enregistrées. Pour les appliquer sur les canaux de publication, republiez ce produit. Vous pouvez aussi le faire plus tard.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRepublishDismiss}
                disabled={republishSending}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Plus tard
              </button>
              <button
                type="button"
                onClick={handleRepublishConfirm}
                disabled={republishSending}
                className="flex-1 px-4 py-2.5 bg-cyan-500 text-white rounded-xl font-semibold text-sm hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-100 dark:shadow-none disabled:opacity-50"
              >
                {republishSending ? 'Envoi…' : 'Republier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataList;