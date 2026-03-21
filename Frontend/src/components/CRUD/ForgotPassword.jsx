import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            setError("Veuillez entrer votre adresse email.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch("http://localhost:8000/api/auth/forgot-password/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message || "Un code de réinitialisation a été envoyé.");
                setTimeout(() => {
                    navigate("/reset-password", { state: { email } });
                }, 1500);
            } else {
                setError(data.error || "Une erreur est survenue.");
            }
        } catch {
            setError("Impossible de contacter le serveur.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4 transition-colors">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-700">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                    <span className="font-bold text-xl text-gray-800 dark:text-white">SmartAutoCommerce</span>
                </div>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Mot de passe oublié</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Entrez votre adresse email pour recevoir un code de réinitialisation.
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 p-3 rounded-xl text-center">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 text-sm text-green-600 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 p-3 rounded-xl text-center">
                        {success}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Adresse email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(""); }}
                            placeholder="votre@email.com"
                            required
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:ring-2 outline-none transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-100 dark:shadow-none"
                    >
                        {loading ? "Envoi en cours..." : "Envoyer le code"}
                    </button>
                </form>

                {/* Back link */}
                <p className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
                    <button type="button" onClick={() => navigate("/login")} className="font-semibold text-cyan-500 hover:underline">
                        ← Retour à la connexion
                    </button>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
