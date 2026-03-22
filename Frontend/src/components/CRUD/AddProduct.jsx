import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useSubscription } from '../SubscriptionGuard';

const AddProduct = ({ onProductAdded }) => {
  const { user } = useAuth();
  const { currentSymbol } = useSettings();
  const { isRestricted } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [prix, setPrix] = useState('');
  const [quantite, setQuantite] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [resumeUrl, setResumeUrl] = useState('');
  const [editableNom, setEditableNom] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [produitNonConforme, setProduitNonConforme] = useState(false);

  const WEBHOOK_ANALYSE = 'https://n8n.projets-omega.net/webhook/1a4d9166-47a7-49f9-8855-12d607142a18';
  const WEBHOOK_VALIDATION = 'https://n8n.projets-omega.net/webhook/d9272863-bee0-4e22-9e29-af5a609eeb9a';

  const startCamera = async () => {
    setPreview(null);
    setImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) { alert("Erreur caméra : " + err.message); }
  };

  const stopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
        setImage(file);
        setPreview(URL.createObjectURL(file));
        stopCamera();
      }, 'image/jpeg', 0.95);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImage(file); setPreview(URL.createObjectURL(file)); stopCamera(); }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('data', image);
    formData.append('id_utilisateur', user.id);
    try {
      const response = await fetch(WEBHOOK_ANALYSE, { method: 'POST', body: formData });
      const data = await response.json();
      const responseData = Array.isArray(data) ? data[0] : data;
      if (responseData.output) {
        setResult(responseData.output);
        setEditableNom(responseData.output.nom);
        setEditableDescription(responseData.output.description);
        setResumeUrl(responseData.url_de_reprise || '');
        // Vérifier si le produit est valide
        setProduitNonConforme(!responseData.output.produit_valide);
      }
    } catch (error) { alert("Erreur d'analyse n8n"); }
    finally { setLoading(false); }
  };

  const validateAndSend = async () => {
    if (!user?.id) { alert("Erreur : utilisateur non identifié"); return; }
    setIsSaving(true);
    const finalNom = isEditMode ? editableNom : result.nom;
    const finalDescription = isEditMode ? editableDescription : result.description;
    const payload = { prix, quantite, nom: finalNom, description: finalDescription, url_de_reprise: resumeUrl, id_utilisateur: user.id };
    try {
      const response = await fetch(WEBHOOK_VALIDATION, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        onProductAdded({ id: Date.now(), name: finalNom, price: prix, stock_quantity: quantite, description: finalDescription, is_published: true });
        resetForm();
      }
    } catch (e) { alert("Erreur n8n validation"); }
    finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setIsOpen(false); setResult(null); setImage(null); setPreview(null); setPrix(''); setQuantite('');
    setEditableNom(''); setEditableDescription(''); setIsEditMode(false); setProduitNonConforme(false); stopCamera();
  };

  const handleAnnulation = async () => {
    if (!user?.id) { alert("Erreur : utilisateur non identifié"); return; }
    setIsSaving(true);
    const payload = {
      annulation: true,
      id_utilisateur: user.id
    };
    try {
      const response = await fetch(WEBHOOK_VALIDATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        resetForm();
      }
    } catch (e) {
      alert("Erreur lors de l'annulation");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => isRestricted ? window.dispatchEvent(new CustomEvent('show-subscription-modal')) : setIsOpen(true)}
        className="group relative flex items-center gap-2 px-4 py-1.5 rounded-md border border-cyan-400/50 text-cyan-500 hover:text-cyan-600 transition-all duration-300 hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 overflow-hidden"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Nouveau</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-100/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 transition-transform duration-500 group-hover:rotate-180">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
              <h2 className="font-black text-gray-800 dark:text-white uppercase tracking-tight">Analyseur de Matériel</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl">&times;</button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {!result ? (
                <div className="space-y-6">
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  {isCameraOpen ? (
                    <div className="space-y-4">
                      <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-4 border-cyan-100 dark:border-cyan-900">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={stopCamera} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl font-bold">Annuler</button>
                        <button onClick={takePhoto} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-200 dark:shadow-none">Capturer</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {preview && <img src={preview} className="max-h-48 mx-auto rounded-lg shadow-md border dark:border-gray-600" alt="Aperçu" />}
                      <div className="grid grid-cols-2 gap-3">
                        <label className="cursor-pointer bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 p-4 rounded-xl border-2 border-dashed border-cyan-200 dark:border-cyan-800 flex flex-col items-center gap-2 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          <span className="text-xs font-bold uppercase">Importer</span>
                          <input type='file' className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                        <button onClick={startCamera} className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex flex-col items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89L.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span className="text-xs font-bold uppercase">Caméra</span>
                        </button>
                      </div>
                      <button
                        onClick={analyzeImage} disabled={!image || loading}
                        className={`w-full py-4 rounded-xl text-white font-black shadow-xl transition-all ${(!image || loading) ? 'bg-gray-300 dark:bg-gray-600' : 'bg-cyan-600 hover:bg-cyan-700'}`}
                      >
                        {loading ? "ANALYSE EN COURS..." : "LANCER L'ANALYSE IA"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {!produitNonConforme && (
                    <div className="bg-cyan-50 dark:bg-cyan-900/30 p-4 rounded-xl border border-cyan-100 dark:border-cyan-800">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          {!isEditMode ? (
                            <>
                              <h3 className="text-cyan-700 dark:text-cyan-400 font-black uppercase text-sm">{result.nom}</h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{result.description}</p>
                            </>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nom du produit</label>
                                <input
                                  type="text"
                                  value={editableNom}
                                  onChange={(e) => setEditableNom(e.target.value)}
                                  className="w-full p-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                  placeholder="Nom du produit"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Description</label>
                                <textarea
                                  value={editableDescription}
                                  onChange={(e) => setEditableDescription(e.target.value)}
                                  className="w-full p-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white text-sm resize-none"
                                  placeholder="Description du produit"
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setIsEditMode(!isEditMode)}
                          className="ml-3 p-2 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
                          title={isEditMode ? "Annuler la modification" : "Modifier les informations"}
                        >
                          {isEditMode ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {!produitNonConforme ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Prix ({currentSymbol})</label>
                          <input type="number" value={prix} onChange={(e) => setPrix(e.target.value)} className="w-full p-3 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Stock</label>
                          <input type="number" value={quantite} onChange={(e) => setQuantite(e.target.value)} className="w-full p-3 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white" />
                        </div>
                      </div>
                      <button
                        onClick={validateAndSend} disabled={isSaving || !prix || !quantite}
                        className="w-full py-4 bg-green-600 text-white font-black rounded-xl shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                      >
                        {isSaving ? "CHARGEMENT..." : "VALIDER L'ENREGISTREMENT"}
                      </button>
                    </>
                  ) : (
                    <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-xl border border-red-200 dark:border-red-800">
                      <p className="text-red-700 dark:text-red-400 font-medium text-sm">
                        Ce produit ne correspond pas aux articles vendus dans votre boutique. Vous ne pouvez pas l'enregistrer.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleAnnulation} disabled={isSaving}
                    className="w-full py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-black rounded-xl border-2 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all disabled:opacity-50"
                  >
                    {isSaving ? "TRAITEMENT..." : "ANNULER L'ANALYSE"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddProduct;
