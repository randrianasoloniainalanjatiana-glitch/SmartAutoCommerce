import React, { useState, useRef } from 'react';

const AddProduct = ({ onProductAdded }) => {
  // États pour le contrôle de la Modal
  const [isOpen, setIsOpen] = useState(false);
  
  // États de l'Analyseur (votre code)
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // États du formulaire final
  const [prix, setPrix] = useState('');
  const [quantite, setQuantite] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [resumeUrl, setResumeUrl] = useState('');

  const WEBHOOK_ANALYSE = 'https://n8n.projets-omega.net/webhook-test/1a4d9166-47a7-49f9-8855-12d607142a18';
  const WEBHOOK_VALIDATION = 'https://n8n.projets-omega.net/webhook-test/d9272863-bee0-4e22-9e29-af5a609eeb9a';

  // --- LOGIQUE CAMÉRA ---
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

  // --- LOGIQUE N8N ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImage(file); setPreview(URL.createObjectURL(file)); stopCamera(); }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('data', image);
    try {
      const response = await fetch(WEBHOOK_ANALYSE, { method: 'POST', body: formData });
      const data = await response.json();
      const responseData = Array.isArray(data) ? data[0] : data;
      if (responseData.output) {
        setResult(responseData.output);
        setResumeUrl(responseData.url_de_reprise || ''); 
      }
    } catch (error) { alert("Erreur d'analyse n8n"); }
    finally { setLoading(false); }
  };

  const validateAndSend = async () => {
    setIsSaving(true);
    const payload = {
      prix, quantite, nom: result.nom, description: result.description, url_de_reprise: resumeUrl 
    };
    try {
      const response = await fetch(WEBHOOK_VALIDATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        // IMPORTANT: On informe le parent (DataList) que le produit est ajouté
        onProductAdded({
            id: Date.now(), // ID temporaire
            name: result.nom,
            price: prix,
            stock_quantity: quantite,
            description: result.description,
            is_published: true
        });
        resetForm();
      }
    } catch (e) { alert("Erreur n8n validation"); }
    finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setIsOpen(false);
    setResult(null);
    setImage(null);
    setPreview(null);
    setPrix('');
    setQuantite('');
    stopCamera();
  };

  return (
    <>
      {/* Bouton pour ouvrir le composant depuis la liste */}
      <button 
        onClick={() => setIsOpen(true)}
        className="group relative flex items-center gap-2 px-4 py-1.5 rounded-md border border-blue-400/50 text-blue-500 hover:text-blue-600 transition-all duration-300 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 overflow-hidden"
      >
        {/* Point lumineux pulsant (Côté "Mignon/Vivant") */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>

        {/* Texte avec espacement futuriste */}
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          Nouveau
        </span>

        {/* Lueur de fond subtile au survol */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        {/* Icône Plus fine */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={3} 
          stroke="currentColor" 
          className="w-3 h-3 transition-transform duration-500 group-hover:rotate-180"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Modal d'insertion intelligente */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-black text-gray-800 uppercase tracking-tight">Analyseur de Matériel</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {!result ? (
                <div className="space-y-6">
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  
                  {isCameraOpen ? (
                    <div className="space-y-4">
                      <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-4 border-blue-100">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={stopCamera} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Annuler</button>
                        <button onClick={takePhoto} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">Capturer</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                        {preview && <img src={preview} className="max-h-48 mx-auto rounded-lg shadow-md border" alt="Aperçu" />}
                        <div className="grid grid-cols-2 gap-3">
                            <label className="cursor-pointer bg-blue-50 text-blue-700 p-4 rounded-xl border-2 border-dashed border-blue-200 flex flex-col items-center gap-2 hover:bg-blue-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <span className="text-xs font-bold uppercase">Importer</span>
                                <input type='file' className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                            <button onClick={startCamera} className="bg-gray-50 text-gray-700 p-4 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center gap-2 hover:bg-gray-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span className="text-xs font-bold uppercase">Caméra</span>
                            </button>
                        </div>
                        <button 
                            onClick={analyzeImage}
                            disabled={!image || loading}
                            className={`w-full py-4 rounded-xl text-white font-black shadow-xl transition-all ${(!image || loading) ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {loading ? "ANALYSE EN COURS..." : "LANCER L'ANALYSE IA"}
                        </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5 animate-in slide-in-from-bottom-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h3 className="text-blue-700 font-black uppercase text-sm">{result.nom}</h3>
                    <p className="text-xs text-gray-600 mt-1">{result.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Prix (€)</label>
                        <input type="number" value={prix} onChange={(e)=>setPrix(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Stock</label>
                        <input type="number" value={quantite} onChange={(e)=>setQuantite(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <button 
                    onClick={validateAndSend} 
                    disabled={isSaving || !prix || !quantite}
                    className="w-full py-4 bg-green-600 text-white font-black rounded-xl shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? "CHARGEMENT..." : "VALIDER L'ENREGISTREMENT"}
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