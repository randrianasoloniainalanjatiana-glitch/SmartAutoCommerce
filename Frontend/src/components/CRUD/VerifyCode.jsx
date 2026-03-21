import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const VerifyCode = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || "";

    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [cooldown, setCooldown] = useState(0);
    const inputRefs = useRef([]);

    // Redirection si pas d'email
    useEffect(() => {
        if (!email) navigate("/register", { replace: true });
    }, [email, navigate]);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        setError("");

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
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

        setLoading(true);
        setError("");
        try {
            const response = await fetch("http://localhost:8000/api/auth/verify-code/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: fullCode }),
            });
            const data = await response.json();
            if (response.ok) {
                setSuccess(data.message || "Email vérifié avec succès !");
                setTimeout(() => navigate("/login"), 1500);
            } else {
                setError(data.error || "Code invalide.");
                setCode(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
            }
        } catch {
            setError("Impossible de contacter le serveur.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        setResending(true);
        setError("");
        try {
            const response = await fetch("http://localhost:8000/api/auth/resend-code/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code_type: "inscription" }),
            });
            const data = await response.json();
            if (response.ok) {
                setSuccess("Un nouveau code a été envoyé !");
                setCooldown(60);
                setCode(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
                setTimeout(() => setSuccess(""), 3000);
            } else {
                setError(data.error || "Impossible de renvoyer le code.");
            }
        } catch {
            setError("Impossible de contacter le serveur.");
        } finally {
            setResending(false);
        }
    };

    if (!email) return null;

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
                    <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Vérification email</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Un code à 6 chiffres a été envoyé à<br />
                        <span className="font-semibold text-cyan-500">{email}</span>
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

                {/* OTP Input */}
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
                  ${digit
                                        ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                                        : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                    }
                  focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-800`}
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || code.join("").length !== 6}
                        className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-100 dark:shadow-none"
                    >
                        {loading ? "Vérification..." : "Vérifier le code"}
                    </button>
                </form>

                {/* Resend */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Vous n'avez pas reçu le code ?</p>
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={cooldown > 0 || resending}
                        className="text-sm font-semibold text-cyan-500 hover:text-cyan-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {resending
                            ? "Envoi en cours..."
                            : cooldown > 0
                                ? `Renvoyer dans ${cooldown}s`
                                : "Renvoyer le code"}
                    </button>
                </div>

                {/* Back link */}
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    <button type="button" onClick={() => navigate("/register")} className="font-semibold text-cyan-500 hover:underline">
                        ← Retour à l'inscription
                    </button>
                </p>
            </div>
        </div>
    );
};

export default VerifyCode;
