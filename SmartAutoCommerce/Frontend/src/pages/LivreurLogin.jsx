import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DJANGO_API } from "../config/apiConfig";

export default function LivreurLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", mot_de_passe: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${DJANGO_API}/auth/login-livreur/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de se connecter en mode livreur.");
        return;
      }

      login(data);
      navigate("/espace-livreur/commandes", { replace: true });
    } catch (err) {
      setError("Erreur réseau. Vérifiez le serveur ou votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Connexion Livreur</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-6">Utilisez vos identifiants de livreur (table Livreur).</p>

          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 rounded-md">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Mot de passe</label>
              <input
                name="mot_de_passe"
                type="password"
                value={form.mot_de_passe}
                onChange={handleChange}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white bg-cyan-500 rounded-xl hover:bg-cyan-600 transition disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter comme livreur"}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-300">
            <button onClick={() => navigate('/login')} className="text-cyan-500 hover:underline">
              Retour à la connexion standard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
