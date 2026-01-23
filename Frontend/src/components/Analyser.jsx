import React, { useState, useRef } from 'react';

export default function ImageAnalyzer() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // --- Nouveaux états pour la Caméra ---
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  // Références pour accéder aux éléments DOM video et canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // ------------------------------------

  // Nouveaux états pour le formulaire final
  const [prix, setPrix] = useState('');
  const [quantite, setQuantite] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [resumeUrl, setResumeUrl] = useState('');

  const WEBHOOK_ANALYSE = 'https://n8n.projets-omega.net/webhook/1a4d9166-47a7-49f9-8855-12d607142a18';
  const WEBHOOK_VALIDATION = 'https://n8n.projets-omega.net/webhook/d9272863-bee0-4e22-9e29-af5a609eeb9a';

  // --- Fonctions de Gestion de la Caméra ---

  // Démarrer la caméra
  const startCamera = async () => {
    setPreview(null);
    setImage(null);
    try {
      // On demande la vidéo. facingMode: 'environment' préfère la caméra arrière sur mobile
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      // On connecte le flux à l'élément vidéo via la ref
      // Un petit délai est parfois nécessaire pour que la ref soit attachée
      setTimeout(() => {
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
      }, 100);

    } catch (err) {
      alert("Erreur d'accès à la caméra : " + err.message + ". Vérifiez les permissions.");
    }
  };

  // Arrêter proprement le flux vidéo
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  // Prendre la photo
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      // On règle la taille du canvas sur la taille de la vidéo
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // On dessine l'image vidéo actuelle sur le canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // On transforme le contenu du canvas en Blob (fichier image)
      canvas.toBlob((blob) => {
        if (blob) {
          // On crée un objet File à partir du blob pour que le reste du code fonctionne pareil
          const generatedFile = new File([blob], "photo-camera.jpg", { type: "image/jpeg" });
          
          setImage(generatedFile);
          setPreview(URL.createObjectURL(generatedFile));
          // Important : on éteint la caméra après la capture
          stopCamera();
        }
      }, 'image/jpeg', 0.95); // Qualité JPEG 95%
    }
  };

  // Annuler la prise de vue
  const cancelCamera = () => {
      stopCamera();
  };

  // ---------------------------------------

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null); 
      stopCamera(); // S'assure que la caméra est coupée si on choisit un fichier
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('data', image);

    try {
      const response = await fetch(WEBHOOK_ANALYSE, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Erreur n8n');
      const data = await response.json();
      const responseData = Array.isArray(data) ? data[0] : data;
      
      if (responseData.output) {
        setResult(responseData.output);
        setResumeUrl(responseData.url_de_reprise || ''); 
      }
    } catch (error) {
      alert("Erreur technique lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const validateAndSend = async () => {
    setIsSaving(true);
    const payload = {
      prix: prix,
      quantite: quantite,
      nom: result.nom,
      description: result.description,
      url_de_reprise: resumeUrl 
    };

    try {
      const response = await fetch(WEBHOOK_VALIDATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Produit enregistré avec succès !");
        setResult(null);
        setImage(null);
        setPreview(null);
        setPrix('');
        setQuantite('');
      }
    } catch (e) {
      alert("Erreur lors de l'enregistrement final");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-5 font-sans">
      <h2 className="text-gray-800 text-center text-2xl font-bold mb-6">
        Analyseur de Matériel
      </h2>
      
      {/* --- Zone d'acquisition (Caméra ou Fichier) --- */}
      {!result && (
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-xl bg-slate-50 text-center transition-colors hover:bg-slate-100 overflow-hidden">
          
          {/* Canvas caché utilisé pour la capture */}
          <canvas ref={canvasRef} className="hidden"></canvas>

          {/* Mode Caméra Activé */}
          {isCameraOpen ? (
            <div className="flex flex-col items-center animate-fade-in">
               {/* Élément Vidéo pour le retour caméra */}
              <div className="relative w-full max-h-80 bg-black rounded-lg overflow-hidden mb-4">
                 <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-contain mx-auto transformed scale-x-[-1]" // scale-x-[-1] pour effet miroir si caméra avant (optionnel)
                 ></video>
              </div>

              <div className="flex gap-3 w-full">
                 <button 
                   onClick={cancelCamera}
                   className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                 >
                    Annuler
                 </button>
                 <button 
                   onClick={takePhoto}
                   className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    Prendre la photo
                 </button>
              </div>
            </div>
          ) : (
            // Mode Sélection (Fichier ou Démarrer Caméra)
            <>
               {/* Boutons de choix initial */}
               {!preview && (
                 <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                   {/* Input fichier standard (caché mais activable via label) */}
                   <label className="cursor-pointer bg-white border border-gray-300 hover:border-blue-500 text-gray-700 font-semibold py-2 px-4 rounded-lg inline-flex items-center gap-2 shadow-sm transition-all flex-1 justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                     Importer un fichier
                     <input type='file' className="hidden" accept="image/*" onChange={handleFileChange} />
                   </label>
                   
                   <span className="text-gray-400 self-center font-medium">OU</span>

                   {/* Bouton pour lancer la caméra */}
                   <button 
                      onClick={startCamera}
                      className="bg-white border border-gray-300 hover:border-blue-500 text-gray-700 font-semibold py-2 px-4 rounded-lg inline-flex items-center gap-2 shadow-sm transition-all flex-1 justify-center"
                   >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      Utiliser la caméra
                   </button>
                 </div>
               )}
              
              {/* Prévisualisation de l'image (Fichier importé OU Photo prise) */}
              {preview && (
                <div className="mb-6 relative group">
                  <img 
                    src={preview} 
                    alt="Prévisualisation" 
                    className="max-w-full max-h-64 rounded-lg mx-auto shadow-sm object-contain" 
                  />
                  {/* Petit bouton pour recommencer si on a déjà une image */}
                  <button 
                    onClick={() => { setPreview(null); setImage(null); }}
                    className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Changer l'image"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
                </div>
              )}
              
              {/* Bouton Principal d'Analyse */}
              <button 
                onClick={analyzeImage} 
                disabled={!image || loading}
                className={`w-full py-3 px-4 rounded-lg text-white font-bold text-lg transition-all duration-200
                  ${(!image || loading) 
                    ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyse en cours...
                  </span>
                ) : "Lancer l'analyse"}
              </button>
            </>
          )}
        </div>
      )}

      {/* --- Zone de Résultat et Formulaire final (Inchangé) --- */}
      {result && (
        <div className="mt-6 p-6 bg-white rounded-xl shadow-lg border-t-4 border-blue-500 animate-fade-in-up">
          <h3 className="text-blue-600 text-xl font-bold mb-2">{result.nom}</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">{result.description}</p>
          
          <div className="border-t border-gray-100 pt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Prix de vente (€)</label>
              <input 
                type="number" 
                value={prix} 
                onChange={(e) => setPrix(e.target.value)} 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ex: 499"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Quantité en stock</label>
              <input 
                type="number" 
                value={quantite} 
                onChange={(e) => setQuantite(e.target.value)} 
                className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ex: 10"
              />
            </div>

            <button 
              onClick={validateAndSend} 
              disabled={isSaving || !prix || !quantite}
              className={`w-full py-3 mt-2 rounded-lg text-white font-bold text-lg transition-all duration-200
                ${(isSaving || !prix || !quantite)
                  ? 'bg-green-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 shadow-md'
                }`}
            >
              {isSaving ? "Enregistrement..." : "Valider l'enregistrement"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}