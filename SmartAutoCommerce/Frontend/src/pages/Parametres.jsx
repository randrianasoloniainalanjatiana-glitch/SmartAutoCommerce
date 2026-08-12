import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { DJANGO_API } from '../config/apiConfig';
import { useSubscription } from '../components/SubscriptionGuard';
import intlTelInput from 'intl-tel-input';
import 'intl-tel-input/build/css/intlTelInput.css';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import countries from 'i18n-iso-countries';
import frLocale from 'i18n-iso-countries/langs/fr.json';

countries.registerLocale(frLocale);

const normalize = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const guessCountryIso2FromName = (countryName) => {
  const wanted = normalize(countryName);
  if (!wanted) return null;
  const names = countries.getNames('fr', { select: 'official' });
  for (const [iso2, frName] of Object.entries(names)) {
    if (normalize(frName) === wanted) return iso2.toLowerCase();
  }
  for (const [iso2, frName] of Object.entries(names)) {
    if (normalize(frName).includes(wanted) || wanted.includes(normalize(frName))) return iso2.toLowerCase();
  }
  return null;
};

const Parametres = () => {
  const { user } = useAuth();
  const { isRestricted } = useSubscription();
  const [parametres, setParametres] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    nom_boutique: '', description_boutique: '', secteur_activite: '', type_entreprise: '',
    pays: '', ville: '', adresse: '', telephone: '', whatsapp: '', email: '', site_web: '',
    debut_jours: '', fin_jours: '', heure: '', livraison: '', zones_livraison: '', frais_livraison: '',
    devise: '', page_access_token: '', page_id: '', posts_token: '', type_produit: '', messenger_id: '',
    start_urls: []
  });

  const phoneInputRef = useRef(null);
  const whatsappInputRef = useRef(null);
  const phoneItiRef = useRef(null);
  const whatsappItiRef = useRef(null);

  const supportedIso2 = useMemo(
    () => new Set((intlTelInput.getCountryData?.() || []).map((c) => c.iso2)),
    []
  );

  const safePhoneCountry = (iso2) => {
    const c = String(iso2 || '').toLowerCase();
    return supportedIso2.has(c) ? c : 'fr';
  };

  const defaultPhoneCountry = safePhoneCountry(guessCountryIso2FromName(formData.pays) || 'fr');

  const livraisonActive = String(formData.livraison || '').trim().toUpperCase() === 'OUI';

  useEffect(() => {
    const fetchParametres = async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const response = await axios.get(`${DJANGO_API}/parametres/${user.id}/`);
        if (response.data) {
          const data = {
            ...response.data,
            livraison: String(response.data.livraison || '').trim().toUpperCase() === 'OUI' ? 'OUI' : 'NON',
          };
          setParametres(data);
          setFormData(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        setParametres({});
      } finally { setLoading(false); }
    };
    fetchParametres();
  }, [user?.id]);

  useEffect(() => {
    if (!editing) {
      if (phoneItiRef.current) {
        phoneItiRef.current.destroy();
        phoneItiRef.current = null;
      }
      if (whatsappItiRef.current) {
        whatsappItiRef.current.destroy();
        whatsappItiRef.current = null;
      }
      return;
    }

    const initIti = (inputRef, itiRef, value) => {
      if (!inputRef.current) return;
      try {
        if (itiRef.current) {
          itiRef.current.destroy();
          itiRef.current = null;
        }
        const parsed = String(value || '').startsWith('+') ? parsePhoneNumberFromString(value) : null;
        const parsedCountry = parsed?.country ? String(parsed.country).toLowerCase() : null;
        itiRef.current = intlTelInput(inputRef.current, {
          initialCountry: safePhoneCountry(parsedCountry || defaultPhoneCountry),
          preferredCountries: ['fr', 'mg', 'us', 'gb'],
          separateDialCode: true,
          nationalMode: true,
          autoPlaceholder: 'aggressive',
          strictMode: false,
          loadUtils: () => import('intl-tel-input/build/js/utils'),
        });
        if (value) itiRef.current.setNumber(value);
      } catch (e) {
        console.error('Erreur init intl-tel-input:', e);
      }
    };

    initIti(phoneInputRef, phoneItiRef, formData.telephone);
    initIti(whatsappInputRef, whatsappItiRef, formData.whatsapp);

    return () => {
      if (phoneItiRef.current) {
        phoneItiRef.current.destroy();
        phoneItiRef.current = null;
      }
      if (whatsappItiRef.current) {
        whatsappItiRef.current.destroy();
        whatsappItiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLivraisonChange = (value) => {
    setFormData(prev => ({ ...prev, livraison: value }));
  };

  const handleStartUrlChange = (index, value) => {
    const newStartUrls = [...(formData.start_urls || [])];
    newStartUrls[index] = { url: value };
    setFormData(prev => ({ ...prev, start_urls: newStartUrls }));
  };

  const handleAddStartUrl = () => {
    const currentUrls = formData.start_urls || [];
    if (currentUrls.length < 5) {
      setFormData(prev => ({ ...prev, start_urls: [...currentUrls, { url: '' }] }));
    }
  };

  const handleRemoveStartUrl = (index) => {
    const newStartUrls = [...(formData.start_urls || [])];
    newStartUrls.splice(index, 1);
    setFormData(prev => ({ ...prev, start_urls: newStartUrls }));
  };

  const handleEditClick = () => {
    setShowPasswordModal(true);
    setPassword('');
    setPasswordError('');
    setFieldErrors({});
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      setPasswordError('Veuillez entrer votre mot de passe');
      return;
    }

    try {
      const response = await axios.post(`${DJANGO_API}/verify-password/`, {
        email: user.email,
        password: password
      });

      if (response.data.valid) {
        setShowPasswordModal(false);
        setEditing(true);
        setPassword('');
        setPasswordError('');
      } else {
        setPasswordError('Mot de passe incorrect');
      }
    } catch (error) {
      console.error('Erreur de vérification du mot de passe:', error);
      setPasswordError('Erreur lors de la vérification du mot de passe');
    }
  };

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setPassword('');
    setPasswordError('');
  };

  const validateForm = () => {
    const errs = {};

    const phoneE164 = phoneItiRef.current?.getNumber?.() || '';
    if (!phoneE164) {
      errs.telephone = 'Téléphone requis.';
    } else if (!phoneItiRef.current?.isValidNumber?.()) {
      errs.telephone = 'Numéro de téléphone invalide.';
    }

    const whatsappE164 = whatsappItiRef.current?.getNumber?.() || '';
    if (whatsappE164 && !whatsappItiRef.current?.isValidNumber?.()) {
      errs.whatsapp = 'Numéro WhatsApp invalide.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!validateForm()) return;

    try {
      setLoading(true);
      const telephone = phoneItiRef.current?.getNumber?.() || formData.telephone;
      const whatsapp = whatsappItiRef.current?.getNumber?.() || formData.whatsapp || '';
      const data = {
        ...formData,
        telephone,
        whatsapp: whatsapp || null,
        site_web: formData.site_web?.trim() || null,
        livraison: livraisonActive ? 'OUI' : 'NON',
        id_utilisateur: user.id,
      };
      const response = await axios.put(`${DJANGO_API}/parametres/${user.id}/`, data);
      setParametres(response.data);
      setFormData(response.data);
      setEditing(false);
      setFieldErrors({});
      alert('Paramètres sauvegardés avec succès!');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    if (parametres) setFormData(parametres);
    setEditing(false);
    setFieldErrors({});
  };

  const inputClass = (disabled) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm transition-all outline-none ${disabled
      ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 cursor-not-allowed'
      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
    }`;

  const phoneWrapperClass = (hasError, disabled) =>
    `rounded-xl border ${hasError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} ${disabled ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-700'} px-3 py-2`;

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

  const PhoneField = ({ label, inputRef, errorKey, value }) => (
    <div>
      <Label>{label}</Label>
      {editing ? (
        <>
          <div className={phoneWrapperClass(!!fieldErrors[errorKey], false)}>
            <input
              ref={inputRef}
              type="tel"
              className="w-full bg-transparent outline-none text-gray-900 dark:text-white text-sm"
              placeholder="Numéro de téléphone"
            />
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Cliquez sur le drapeau pour choisir un pays. Vous pouvez rechercher le pays dans la liste.
          </div>
          {fieldErrors[errorKey] && (
            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{fieldErrors[errorKey]}</p>
          )}
        </>
      ) : (
        <div className={inputClass(true)}>{value || '—'}</div>
      )}
    </div>
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
                <button onClick={() => isRestricted ? window.dispatchEvent(new CustomEvent('show-subscription-modal')) : handleEditClick()} className="px-5 py-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors font-semibold text-sm shadow-md shadow-cyan-100 dark:shadow-none">Modifier</button>
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
                <PhoneField label="Téléphone" inputRef={phoneInputRef} errorKey="telephone" value={formData.telephone} />
                <PhoneField label="WhatsApp (optionnel)" inputRef={whatsappInputRef} errorKey="whatsapp" value={formData.whatsapp} />
                <div><Label>Email</Label><input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Site web (optionnel)</Label><input type="text" name="site_web" value={formData.site_web || ''} onChange={handleInputChange} disabled={!editing} placeholder="https://..." className={inputClass(!editing)} /></div>
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
              <div className="space-y-4">
                <div>
                  <Label>Proposez-vous la livraison ?</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-sm font-bold uppercase tracking-wide transition-colors ${!livraisonActive ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                      NON
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={livraisonActive}
                      aria-label="Activer la livraison"
                      disabled={!editing}
                      onClick={() => handleLivraisonChange(livraisonActive ? 'NON' : 'OUI')}
                      className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        livraisonActive ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-600'
                      } ${!editing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                          livraisonActive ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-bold uppercase tracking-wide transition-colors ${livraisonActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      OUI
                    </span>
                  </div>
                </div>

                {livraisonActive && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div><Label>Frais de livraison</Label><input type="text" name="frais_livraison" value={formData.frais_livraison || ''} onChange={handleInputChange} disabled={!editing} placeholder="Ex: 500 FCFA" className={inputClass(!editing)} /></div>
                    <div className="md:col-span-2"><Label>Zones de livraison</Label><textarea name="zones_livraison" value={formData.zones_livraison || ''} onChange={handleInputChange} disabled={!editing} rows="2" placeholder="Ex: Abidjan, Bassam" className={inputClass(!editing)} /></div>
                  </div>
                )}
              </div>
            </div>

            {/* Configuration API */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Configuration API (Facebook)</h3>
                <a
                  href="/aide/configuration-api-facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50"
                  title="Ouvrir le guide de configuration dans un nouvel onglet"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Aide
                </a>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div><Label>Messenger Token</Label><input type="password" name="page_access_token" value={formData.page_access_token || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
                <div><Label>Page ID</Label><input type="text" name="messenger_id" value={formData.messenger_id || ''} onChange={handleInputChange} disabled={!editing} placeholder="ID Messenger Facebook" className={inputClass(!editing)} /></div>
                <div><Label>Posts Token</Label><input type="password" name="posts_token" value={formData.posts_token || ''} onChange={handleInputChange} disabled={!editing} className={inputClass(!editing)} /></div>
              </div>
            </div>

            {/* url de page facebook concurent */}
            <div>
              <SectionTitle>url de page facebook concurent</SectionTitle>
              <div className="space-y-3">
                {formData.start_urls && formData.start_urls.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="url"
                      value={item?.url || ''}
                      onChange={(e) => handleStartUrlChange(index, e.target.value)}
                      disabled={!editing}
                      placeholder="https://example.com"
                      className={`${inputClass(!editing)} flex-1`}
                    />
                    {editing && (
                      <button
                        onClick={() => handleRemoveStartUrl(index)}
                        className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors shrink-0"
                        title="Supprimer cette URL"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    )}
                  </div>
                ))}

                {editing && (!formData.start_urls || formData.start_urls.length < 5) && (
                  <button
                    onClick={handleAddStartUrl}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-semibold mt-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Ajouter une URL
                  </button>
                )}
                {(!formData.start_urls || formData.start_urls.length === 0) && !editing && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucune URL de démarrage configurée.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de vérification du mot de passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Vérification de sécurité
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Veuillez entrer votre mot de passe pour modifier les paramètres
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Entrez votre mot de passe"
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handlePasswordModalClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium text-sm"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parametres;
