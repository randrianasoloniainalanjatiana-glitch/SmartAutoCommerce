import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || "";

    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [cooldown, setCooldown] = useState(0);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!email) navigate("/forgot-password", { replace: true });
    }, [email, navigate]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleCodeChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        setError("");
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(""));
            inputRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fullCode = code.join("");

        if (fullCode.length !== 6) {
            setError("Veuillez entrer le code complet à 6 chiffres.");
            return;
        }
        if (newPassword.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const response = await fetch("http://localhost:8000/api/auth/reset-password/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    code: fullCode,
                    nouveau_mot_de_passe: newPassword,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setSuccess(data.message || "Mot de passe réinitialisé avec succès !");
                setTimeout(() => navigate("/login"), 1500);
            } else {
                setError(data.error || "Une erreur est survenue.");
                if (data.error?.includes("Code incorrect")) {
                    setCode(["", "", "", "", "", ""]);
                    inputRefs.current[0]?.focus();
                }
            }
        } catch {
            setError("Impossible de contacter le serveur.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        try {
            const response = await fetch("http://localhost:8000/api/auth/forgot-password/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                setSuccess("Un nouveau code a été envoyé !");
                setCooldown(60);
                setCode(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
                setTimeout(() => setSuccess(""), 3000);
            }
        } catch {
            setError("Impossible de contacter le serveur.");
        }
    };

    if (!email) return null;

    const inputClass =
        "w-full px-4 py-2.5 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none";

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
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Nouveau mot de passe</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Entrez le code reçu à <span className="font-semibold text-cyan-500">{email}</span> et choisissez un nouveau mot de passe.
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

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* OTP Code */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Code de vérification
                        </label>
                        <div className="flex justify-center gap-2" onPaste={handlePaste}>
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className={`w-11 h-13 text-center text-lg font-bold rounded-xl border-2 transition-all outline-none
                    ${digit
                                            ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                        }
                    focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-800`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Nouveau mot de passe
                        </label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                                placeholder="Minimum 6 caractères"
                                className={inputClass}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showNew ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Confirmer le mot de passe
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                                placeholder="Retapez le mot de passe"
                                className={`${inputClass} ${confirmPassword && confirmPassword !== newPassword
                                        ? "border-red-400 focus:ring-red-400"
                                        : confirmPassword && confirmPassword === newPassword
                                            ? "border-green-400 focus:ring-green-400"
                                            : ""
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showConfirm ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                        {confirmPassword && confirmPassword !== newPassword && (
                            <p className="text-xs text-red-500 mt-1 font-medium">Les mots de passe ne correspondent pas</p>
                        )}
                        {confirmPassword && confirmPassword === newPassword && (
                            <p className="text-xs text-green-500 mt-1 font-medium">✓ Les mots de passe correspondent</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || code.join("").length !== 6 || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                        className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-100 dark:shadow-none"
                    >
                        {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                    </button>
                </form>

                {/* Resend */}
                <div className="mt-5 text-center">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={cooldown > 0}
                        className="text-xs font-semibold text-cyan-500 hover:text-cyan-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {cooldown > 0 ? `Renvoyer le code dans ${cooldown}s` : "Renvoyer le code"}
                    </button>
                </div>

                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                    <button type="button" onClick={() => navigate("/login")} className="font-semibold text-cyan-500 hover:underline">
                        ← Retour à la connexion
                    </button>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;
