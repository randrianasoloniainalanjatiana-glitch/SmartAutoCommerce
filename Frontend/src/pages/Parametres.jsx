import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Parametres = () => {
  const { user } = useAuth();
  const [parametres, setParametres] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom_boutique: '', description_boutique: '', secteur_activite: '', type_entreprise: '',
    pays: '', ville: '', adresse: '', telephone: '', whatsapp: '', email: '', site_web: '',
    debut_jours: '', fin_jours: '', heure: '', livraison: '', zones_livraison: '', frais_livraison: '',
    devise: '', page_access_token: '', page_id: '', posts_token: '', type_produit: '', messenger_id: ''
  });

  useEffect(() => {
    const fetchParametres = async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const response = await axios.get(`http://localhost:8000/api/parametres/${user.id}/`);
        if (response.data) { setParametres(response.data); setFormData(response.data); }
      } catch (error) {
        console.error("Erreur lors du chargement des paramètres:", error);
        setParametres({});
      } finally { setLoading(false); }
    };
    fetchParametres();
  }, [user?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = { ...formData, id_utilisateur: user.id };
      const response = await axios.put(`http://localhost:8000/api/parametres/${user.id}/`, data);
      setParametres(response.data);
      setEditing(false);
      alert('Paramètres sauvegardés avec succès!');
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    if (parametres) setFormData(parametres);
    setEditing(false);
  };

  const inputClass = (disabled) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm transition-all outline-none ${disabled
      ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 cursor-not-allowed'
      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
    }`;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const SectionTitle = ({ children }) => (
    <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">{children}</h3>
  );

  const Label = ({ children }) => (
    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">{children}</label>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">

          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">PARAMÈTRES DE LA BOUTIQUE</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {parametres && parametres.id ? 'Modifier vos informations' : 'Configurer votre boutique'}
              </p>
            </div>
            <div className="flex gap-2">
              {!editing ? (
                <button onClick={() => setEditing(true)} className="px-5 py-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors font-semibold text-sm shadow-md shadow-cyan-100 dark:shadow-none">Modifier</button>
              ) : (
                <>
                  <button onClick={handleCancel} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold text-sm">Annuler</button>
                  <button onClick={handleSave} disabled={loading} className="px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold text-sm disabled:opacity-50 shadow-md shadow-green-100 dark:shadow-none">
                    {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Informations générales */}
            <div>
              <SectionTitle>Informations générales</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nom de la boutique</Label><input type="text" name="nom_boutique" value={formData.nom_boutique || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Secteur d'activité</Label><input type="text" name="secteur_activite" value={formData.secteur_activite || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Type d'entreprise</Label><input type="text" name="type_entreprise" value={formData.type_entreprise || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Type de produit</Label><input type="text" name="type_produit" value={formData.type_produit || ''} onChange={handleInputChange} disabled={!editing} placeholder="Ex: accessoire informatique" className={inputClass(!editing)} /></div>
                <div><Label>Devise</Label><input type="text" name="devise" value={formData.devise || ''} onChange={handleInputChange} disabled={!editing} placeholder="Ex: EUR, USD" className={inputClass(!editing)} /></div>
                <div><Label>Messenger ID</Label><input type="text" name="messenger_id" value={formData.messenger_id || ''} onChange={handleInputChange} disabled={!editing} placeholder="ID Messenger Facebook" className={inputClass(!editing)} /></div>
              </div>
              <div className="mt-4">
                <Label>Description de la boutique</Label>
                <textarea name="description_boutique" value={formData.description_boutique || ''} onChange={handleInputChange} disabled={!editing} rows="3" className={inputClass(!editing)} />
              </div>
            </div>

            {/* Coordonnées */}
            <div>
              <SectionTitle>Coordonnées</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Pays</Label><input type="text" name="pays" value={formData.pays || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Ville</Label><input type="text" name="ville" value={formData.ville || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div className="md:col-span-2"><Label>Adresse</Label><input type="text" name="adresse" value={formData.adresse || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Téléphone</Label><input type="tel" name="telephone" value={formData.telephone || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>WhatsApp</Label><input type="tel" name="whatsapp" value={formData.whatsapp || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Email</Label><input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Site web</Label><input type="url" name="site_web" value={formData.site_web || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
              </div>
            </div>

            {/* Horaires */}
            <div>
              <SectionTitle>Horaires d'ouverture</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Jour de début</Label><input type="text" name="debut_jours" value={formData.debut_jours || ''} onChange={handleInputChange} disabled={!editing} placeholder="Ex: Lundi" className={inputClass(!editing)} /></div>
                <div><Label>Jour de fin</Label><input type="text" name="fin_jours" value={formData.fin_jours || ''} onChange={handleInputChange} disabled={!editing} placeholder="Ex: Dimanche" className={inputClass(!editing)} /></div>
                <div><Label>Heures</Label><input type="text" name="heure" value={formData.heure || ''} onChange={handleInputChange} disabled={!editing} placeholder="Ex: 09:00 - 18:00" className={inputClass(!editing)} /></div>
              </div>
            </div>

            {/* Livraison */}
            <div>
              <SectionTitle>Livraison</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Type de livraison</Label><input type="text" name="livraison" value={formData.livraison || ''} onChange={handleInputChange} disabled={!editing} placeholder="Ex: Standard, Express" className={inputClass(!editing)} /></div>
                <div><Label>Frais de livraison</Label><input type="text" name="frais_livraison" value={formData.frais_livraison || ''} onChange={handleInputChange} disabled={!editing} placeholder="Ex: 500 FCFA" className={inputClass(!editing)} /></div>
                <div className="md:col-span-2"><Label>Zones de livraison</Label><textarea name="zones_livraison" value={formData.zones_livraison || ''} onChange={handleInputChange} disabled={!editing} rows="2" placeholder="Ex: Abidjan, Bassam" className={inputClass(!editing)} /></div>
              </div>
            </div>

            {/* Configuration API */}
            <div>
              <SectionTitle>Configuration API (Facebook)</SectionTitle>
              <div className="grid grid-cols-1 gap-4">
                <div><Label>Page Access Token</Label><input type="password" name="page_access_token" value={formData.page_access_token || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Page ID</Label><input type="text" name="page_id" value={formData.page_id || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Posts Token</Label><input type="password" name="posts_token" value={formData.posts_token || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Parametres;
