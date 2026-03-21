import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Inscription = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", mot_de_passe: "", nom: "", prenom: "", telephone: "", adresse: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok && !data.requires_verification) {
        setError(data.error || "Une erreur est survenue.");
      } else {
        setSuccess(data.message || "Un code de confirmation a été envoyé !");
        // Rediriger vers la page de vérification avec l'email
        setTimeout(() => {
          navigate("/verify-code", { state: { email: form.email } });
        }, 1200);
      }
    } catch (err) {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <span className="font-bold text-xl text-gray-800 dark:text-white">SmartAutoCommerce</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Inscription</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Créez un compte pour accéder à votre espace.</p>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 p-3 rounded-xl">{error}</div>}
        {success && <div className="mb-4 text-sm text-green-600 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 p-3 rounded-xl">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:ring-2 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Mot de passe</label>
            <input name="mot_de_passe" type="password" value={form.mot_de_passe} onChange={handleChange} required
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:ring-2 outline-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Prénom</label>
              <input name="prenom" type="text" value={form.prenom} onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:ring-2 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Nom</label>
              <input name="nom" type="text" value={form.nom} onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:ring-2 outline-none transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Téléphone</label>
            <input name="telephone" type="text" value={form.telephone} onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:ring-2 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Adresse</label>
            <input name="adresse" type="text" value={form.adresse} onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:ring-2 outline-none transition-all" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-100 dark:shadow-none">
            {loading ? "Enregistrement..." : "S'inscrire"}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          Vous avez déjà un compte ? <button type="button" onClick={() => navigate('/login')} className="font-semibold text-cyan-500 hover:underline">Se connecter</button>
        </p>
      </div>
    </div>
  );
};

export default Inscription;
