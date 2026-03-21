import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, MapPin, Edit3, Save, X } from 'lucide-react';

const Profile = () => {
    const { user, login } = useAuth();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        nom: user?.nom || '',
        prenom: user?.prenom || '',
        email: user?.email || '',
        telephone: user?.telephone || '',
        adresse: user?.adresse || '',
    });

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await fetch(`http://localhost:8000/api/auth/update/${user.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                const updatedUser = { ...user, ...formData };
                login(updatedUser);
                setSuccess('Profil mis à jour avec succès !');
                setEditing(false);
            } else {
                const data = await response.json();
                setError(data.error || 'Erreur lors de la mise à jour.');
            }
        } catch (err) {
            setError('Impossible de contacter le serveur.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            nom: user?.nom || '',
            prenom: user?.prenom || '',
            email: user?.email || '',
            telephone: user?.telephone || '',
            adresse: user?.adresse || '',
        });
        setEditing(false);
        setError('');
        setSuccess('');
    };

    const getUserAvatar = () => {
        const name = `${user?.nom || ''} ${user?.prenom || ''}`;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=128`;
    };

    const inputClass = (disabled) =>
        `w-full px-4 py-2.5 border rounded-xl text-sm transition-all outline-none ${disabled
            ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
            : 'bg-white border-gray-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600'
        }`;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-sans">
            <div className="max-w-3xl mx-auto">

                {/* Card Profil Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                    {/* Banner */}
                    <div className="h-32 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 relative">
                        <div className="absolute -bottom-12 left-8">
                            <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden bg-white">
                                <img src={getUserAvatar()} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-16 pb-6 px-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-black text-gray-800 dark:text-white">
                                    {user?.prenom} {user?.nom}
                                </h1>
                                <p className="text-sm text-gray-400 mt-1">Administrateur</p>
                            </div>
                            {!editing ? (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-100 dark:shadow-none"
                                >
                                    <Edit3 size={16} /> Modifier
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCancel}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <X size={16} /> Annuler
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 shadow-md shadow-green-100 dark:shadow-none"
                                    >
                                        <Save size={16} /> {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                {success && (
                    <div className="mb-4 text-sm text-green-600 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 rounded-xl font-medium">
                        {success}
                    </div>
                )}
                {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 rounded-xl font-medium">
                        {error}
                    </div>
                )}

                {/* Informations personnelles */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <User size={20} className="text-cyan-500" />
                        Informations personnelles
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Prénom</label>
                            <input
                                name="prenom"
                                value={formData.prenom}
                                onChange={handleChange}
                                disabled={!editing}
                                className={inputClass(!editing)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Nom</label>
                            <input
                                name="nom"
                                value={formData.nom}
                                onChange={handleChange}
                                disabled={!editing}
                                className={inputClass(!editing)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <Mail size={14} /> Email
                            </label>
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={!editing}
                                className={inputClass(!editing)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <Phone size={14} /> Téléphone
                            </label>
                            <input
                                name="telephone"
                                value={formData.telephone}
                                onChange={handleChange}
                                disabled={!editing}
                                className={inputClass(!editing)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <MapPin size={14} /> Adresse
                            </label>
                            <input
                                name="adresse"
                                value={formData.adresse}
                                onChange={handleChange}
                                disabled={!editing}
                                className={inputClass(!editing)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
