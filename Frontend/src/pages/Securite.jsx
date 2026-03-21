import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';

const Securite = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [form, setForm] = useState({
        ancien_mot_de_passe: '',
        nouveau_mot_de_passe: '',
        confirmer_mot_de_passe: '',
    });

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validations
        if (!form.ancien_mot_de_passe || !form.nouveau_mot_de_passe || !form.confirmer_mot_de_passe) {
            setError('Veuillez remplir tous les champs.');
            return;
        }

        if (form.nouveau_mot_de_passe.length < 6) {
            setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        if (form.nouveau_mot_de_passe !== form.confirmer_mot_de_passe) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        if (form.ancien_mot_de_passe === form.nouveau_mot_de_passe) {
            setError('Le nouveau mot de passe doit être différent de l\'ancien.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/auth/change-password/${user.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ancien_mot_de_passe: form.ancien_mot_de_passe,
                    nouveau_mot_de_passe: form.nouveau_mot_de_passe,
                }),
            });

            if (response.ok) {
                setSuccess('Mot de passe modifié avec succès !');
                setForm({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmer_mot_de_passe: '' });
            } else {
                const data = await response.json();
                setError(data.error || 'Erreur lors de la modification du mot de passe.');
            }
        } catch (err) {
            setError('Impossible de contacter le serveur.');
        } finally {
            setLoading(false);
        }
    };

    // Indicateurs de force du mot de passe
    const getPasswordStrength = (password) => {
        if (!password) return { level: 0, label: '', color: '' };
        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 1) return { level: 1, label: 'Faible', color: 'bg-red-500' };
        if (score <= 2) return { level: 2, label: 'Moyen', color: 'bg-orange-500' };
        if (score <= 3) return { level: 3, label: 'Bon', color: 'bg-yellow-500' };
        if (score <= 4) return { level: 4, label: 'Fort', color: 'bg-green-400' };
        return { level: 5, label: 'Très fort', color: 'bg-green-600' };
    };

    const strength = getPasswordStrength(form.nouveau_mot_de_passe);

    const inputClass = "w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-sans">
            <div className="max-w-2xl mx-auto">

                {/* En-tête */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                    <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center px-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <Shield size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-white">Sécurité du compte</h1>
                                <p className="text-sm text-white/70">Modifier votre mot de passe de connexion</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                {success && (
                    <div className="mb-4 text-sm text-green-600 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 rounded-xl font-medium flex items-center gap-2">
                        <Check size={18} className="shrink-0" /> {success}
                    </div>
                )}
                {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-xl font-medium flex items-center gap-2">
                        <AlertTriangle size={18} className="shrink-0" /> {error}
                    </div>
                )}

                {/* Formulaire */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <Lock size={20} className="text-indigo-500" />
                        Changer le mot de passe
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Ancien mot de passe */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                                Mot de passe actuel
                            </label>
                            <div className="relative">
                                <input
                                    name="ancien_mot_de_passe"
                                    type={showOld ? 'text' : 'password'}
                                    value={form.ancien_mot_de_passe}
                                    onChange={handleChange}
                                    placeholder="Entrez votre mot de passe actuel"
                                    className={inputClass}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOld(!showOld)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Nouveau mot de passe */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                                Nouveau mot de passe
                            </label>
                            <div className="relative">
                                <input
                                    name="nouveau_mot_de_passe"
                                    type={showNew ? 'text' : 'password'}
                                    value={form.nouveau_mot_de_passe}
                                    onChange={handleChange}
                                    placeholder="Minimum 6 caractères"
                                    className={inputClass}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {/* Barre de force */}
                            {form.nouveau_mot_de_passe && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.level ? strength.color : 'bg-gray-200 dark:bg-gray-600'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <span className={`text-xs font-semibold ${strength.level <= 1 ? 'text-red-500' :
                                            strength.level <= 2 ? 'text-orange-500' :
                                                strength.level <= 3 ? 'text-yellow-500' : 'text-green-500'
                                        }`}>
                                        {strength.label}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Confirmer */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                                Confirmer le nouveau mot de passe
                            </label>
                            <div className="relative">
                                <input
                                    name="confirmer_mot_de_passe"
                                    type={showConfirm ? 'text' : 'password'}
                                    value={form.confirmer_mot_de_passe}
                                    onChange={handleChange}
                                    placeholder="Retapez le nouveau mot de passe"
                                    className={`${inputClass} ${form.confirmer_mot_de_passe && form.confirmer_mot_de_passe !== form.nouveau_mot_de_passe
                                            ? 'border-red-400 focus:ring-red-400'
                                            : form.confirmer_mot_de_passe && form.confirmer_mot_de_passe === form.nouveau_mot_de_passe
                                                ? 'border-green-400 focus:ring-green-400'
                                                : ''
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {form.confirmer_mot_de_passe && form.confirmer_mot_de_passe !== form.nouveau_mot_de_passe && (
                                <p className="text-xs text-red-500 mt-1 font-medium">Les mots de passe ne correspondent pas</p>
                            )}
                            {form.confirmer_mot_de_passe && form.confirmer_mot_de_passe === form.nouveau_mot_de_passe && (
                                <p className="text-xs text-green-500 mt-1 font-medium flex items-center gap-1"><Check size={14} /> Les mots de passe correspondent</p>
                            )}
                        </div>

                        {/* Bouton */}
                        <button
                            type="submit"
                            disabled={loading || !form.ancien_mot_de_passe || !form.nouveau_mot_de_passe || !form.confirmer_mot_de_passe || form.nouveau_mot_de_passe !== form.confirmer_mot_de_passe}
                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 dark:shadow-none"
                        >
                            {loading ? 'Modification en cours...' : 'Modifier le mot de passe'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Securite;
