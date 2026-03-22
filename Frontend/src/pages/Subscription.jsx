import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, Calendar, CheckCircle, ShieldCheck } from 'lucide-react';
import StripeCheckout from '../components/StripeCheckout';

// Configuration
const PAYPAL_CLIENT_ID = "AUK5ipurA2O7VoUFTM99bS7bkoT5HztegpkcD__An-3HsRNUukYXT5to-7kXSRGH6ttLyB3GAgVjwEgK";
const API_BASE_URL = "http://localhost:8000/api"; // Assuming the backend is running here

const Subscription = () => {
    const [selectedPlan, setSelectedPlan] = useState('mensuel');
    const [paymentMethod, setPaymentMethod] = useState('stripe');
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Assuming you have a UserContext or similar to get the current user ID
    // In this example, we mock it or extract it from local storage
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?.id;

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            return;
        }

        const fetchStatus = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/subscription/status/${userId}/?t=${new Date().getTime()}`);
                setSubscriptionStatus(response.data);
            } catch (error) {
                console.error("Error fetching status", error);
                setSubscriptionStatus({ error: true, message: error.response?.data?.error || error.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchStatus();
    }, [userId, navigate]);

    const handleStartTrial = async () => {
        try {
            await axios.post(`${API_BASE_URL}/subscription/start-trial/`, { user_id: userId });
            window.location.href = '/';
        } catch (error) {
            alert("Erreur lors de l'activation de l'essai gratuit.");
        }
    };

    const createOrder = async (data, actions) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/subscription/create-order/`, {
                type_plan: selectedPlan
            });
            return response.data.order_id;
        } catch (error) {
            alert("Veuillez patienter/réessayer. Erreur de création.");
        }
    };

    const onApprove = async (data, actions) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/subscription/capture-order/`, {
                order_id: data.orderID,
                user_id: userId,
                type_plan: selectedPlan
            });
            alert(response.data.message || "Paiement validé !");
            window.location.href = '/';
        } catch (error) {
            alert("Erreur lors de la capture du paiement.");
        }
    };

    if (isLoading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-900 dark:text-white">Chargement...</div>;

    const hasUsedTrial = subscriptionStatus?.essai_utilise || false;
    const isCurrentlyActive = subscriptionStatus?.statut === 'actif';

    return (
        <div className="w-full flex justify-center py-4">
            <div className="max-w-4xl w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-purple-600 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                            Passez à la vitesse supérieure
                        </h1>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">
                            Choisissez le plan qui correspond le mieux à vos besoins. Obtenez un accès complet à SmartAutoCommerce.
                        </p>
                    </div>

                    {/* User Status Banner */}
                    {subscriptionStatus?.error ? (
                        <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-red-300">Erreur Serveur ({subscriptionStatus.message})</h3>
                                <p className="text-red-200/70 text-sm">Impossible de récupérer votre abonnement. Avez-vous exécuté le code SQL et redémarré le serveur backend ?</p>
                            </div>
                        </div>
                    ) : subscriptionStatus?.status === 'no_subscription' ? (
                        <div className="mb-8 p-6 bg-blue-900/20 rounded-xl border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <ShieldCheck className="text-yellow-400 w-10 h-10 shrink-0" />
                                <div>
                                    <h3 className="text-xl font-bold text-white">Bienvenue sur SmartAutoCommerce !</h3>
                                    <p className="text-blue-100/80 mt-1 text-sm">
                                        Vous devez avoir un abonnement actif pour continuer.
                                        Démarrez votre <b>essai gratuit de 10 jours</b> immédiatement ou choisissez un plan payant ci-dessous.
                                    </p>
                                </div>
                            </div>
                            {!hasUsedTrial && (
                                <button
                                    onClick={handleStartTrial}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-lg shadow-blue-500/30 shrink-0"
                                >
                                    <Calendar size={18} /> Démarrer l'essai (10j)
                                </button>
                            )}
                        </div>
                    ) : isCurrentlyActive ? (
                        <div className="mb-8 p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-500/30 flex items-center gap-4">
                            <CheckCircle className="text-green-500 dark:text-green-400 w-8 h-8" />
                            <div>
                                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Votre abonnement est actif</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Plan : <span className="text-gray-900 dark:text-white capitalize">{subscriptionStatus.type_plan}</span> -
                                    Expire le {new Date(subscriptionStatus.fin_periode_actuelle).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-lg flex items-center gap-4">
                            <CreditCard className="text-red-500 dark:text-red-400 w-8 h-8" />
                            <div>
                                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Abonnement expiré</h3>
                                <p className="text-red-600 dark:text-red-200/70 text-sm">Votre accès est restreint. Veuillez renouveler votre abonnement.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-8 my-10">
                        {/* Mensuel */}
                        <div
                            onClick={() => setSelectedPlan('mensuel')}
                            className={`relative cursor-pointer transition-all duration-300 rounded-xl p-6 border-2 
                ${selectedPlan === 'mensuel' ? 'border-blue-500 bg-blue-50 dark:bg-gray-800/80' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-blue-300 dark:hover:border-gray-700'}`}
                        >
                            <h2 className="text-2xl font-bold flex items-center text-gray-900 dark:text-white gap-3">Mensuel</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Flexibilité maximale, sans engagement sur le long terme.</p>
                            <div className="mt-6 mb-4">
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">19.99$</span>
                                <span className="text-gray-500"> / mois</span>
                            </div>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><CheckCircle size={16} className="text-blue-500 dark:text-blue-400" /> Accès complet aux fonctionnalités</li>
                                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><CheckCircle size={16} className="text-blue-500 dark:text-blue-400" /> Support standard</li>
                            </ul>
                        </div>

                        {/* Annuel */}
                        <div
                            onClick={() => setSelectedPlan('annuel')}
                            className={`relative cursor-pointer transition-all duration-300 rounded-xl p-6 border-2 
                ${selectedPlan === 'annuel' ? 'border-purple-500 bg-purple-50 dark:bg-gray-800/80 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-purple-300 dark:hover:border-gray-700'}`}
                        >
                            <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">POPULAIRE</div>
                            <h2 className="text-2xl font-bold flex items-center text-gray-900 dark:text-white gap-3">Annuel</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Le meilleur choix pour votre business à long terme.</p>
                            <div className="mt-6 mb-4">
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">199.90$</span>
                                <span className="text-gray-500"> / an</span>
                                <p className="text-green-600 dark:text-green-400 text-xs mt-1 font-bold">Économisez 15%</p>
                            </div>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><CheckCircle size={16} className="text-purple-500 dark:text-purple-400" /> Accès complet aux fonctionnalités</li>
                                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><CheckCircle size={16} className="text-purple-500 dark:text-purple-400" /> Support prioritaire</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-6 mt-8">
                        {/* Sélecteur de méthode de paiement */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setPaymentMethod('stripe')}
                                className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${paymentMethod === 'stripe' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                <CreditCard size={18} /> Carte Bancaire
                            </button>
                            <button
                                onClick={() => setPaymentMethod('paypal')}
                                className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${paymentMethod === 'paypal' ? 'bg-[#0070ba] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                PayPal
                            </button>
                        </div>

                        <div className="w-full max-w-sm mt-4 min-h-[300px] flex justify-center">
                            {paymentMethod === 'stripe' ? (
                                <StripeCheckout plan={selectedPlan} userId={userId} />
                            ) : (
                                <div className="w-full">
                                    <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: "EUR", intent: "capture" }}>
                                        <PayPalButtons
                                            style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                                            createOrder={createOrder}
                                            onApprove={onApprove}
                                        />
                                    </PayPalScriptProvider>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Subscription;
