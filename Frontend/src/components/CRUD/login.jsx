import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", mot_de_passe: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Identifiants invalides.");
      } else {
        login(data);
        navigate("/");
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

        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Connexion</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Connectez-vous pour accéder à votre compte.</p>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 p-3 rounded-xl">{error}</div>}

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
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-100 dark:shadow-none">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          Pas de compte ? <button type="button" onClick={() => navigate('/register')} className="font-semibold text-cyan-500 hover:underline">S'inscrire</button>
        </p>
      </div>
    </div>
  );
};

export default Login;
