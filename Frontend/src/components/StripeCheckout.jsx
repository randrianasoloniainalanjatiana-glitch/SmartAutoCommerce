import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { CircleAlert, Loader2 } from 'lucide-react';

const stripePromise = loadStripe("pk_test_51TDgHvL60IFtafgnZyoetoxrba2R3zYHcX7uB8DYxiqHmZLEPMvcZ38LUWddskJIHCXuuRkEN8rf7YLrFGASZzg600pC4Lk2CB");
const API_BASE_URL = "http://localhost:8000/api";

const CheckoutForm = ({ clientSecret, userId, plan, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setError(null);

        // Confirm the payment
        const { error: submitError, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL isn't strictly used since redirect is 'if_required' for cards
                // but Stripe requires it in typescript for some payment methods
                return_url: window.location.origin,
            },
            redirect: 'if_required',
        });

        if (submitError) {
            setError(submitError.message);
            setIsProcessing(false);
            return;
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
            try {
                // Call backend to capture logic
                const response = await axios.post(`${API_BASE_URL}/subscription/capture-stripe-payment/`, {
                    payment_intent_id: paymentIntent.id,
                    user_id: userId,
                    type_plan: plan
                });
                onSuccess(response.data.message);
            } catch (backendError) {
                console.error("Backend error capturing stripe payment:", backendError);
                setError("Le paiement a été accepté par la banque mais une erreur s'est produite lors de l'activation. Veuillez contacter le support.");
            }
        } else {
            setError("Le paiement n'a pas pu être finalisé.");
        }

        setIsProcessing(false);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700">
                <PaymentElement options={{
                    theme: document.documentElement.classList.contains('dark') ? 'night' : 'stripe',
                    variables: {
                        colorPrimary: '#3b82f6',
                        colorBackground: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                        colorText: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937',
                        colorDanger: '#ef4444',
                        fontFamily: 'ui-sans-serif, system-ui, sans-serif'
                    }
                }} />
            </div>
            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                    <CircleAlert size={16} />
                    <span>{error}</span>
                </div>
            )}
            <button
                type="submit"
                disabled={isProcessing || !stripe || !elements}
                className={`w-full py-3 px-4 flex justify-center items-center gap-2 rounded-lg font-bold transition-all shadow-lg
                    ${isProcessing || !stripe ? 'bg-blue-800/50 text-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'}`}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        Traitement en cours...
                    </>
                ) : (
                    'Payer par carte de crédit'
                )}
            </button>
        </form>
    );
};

const StripeCheckout = ({ plan, userId }) => {
    const [clientSecret, setClientSecret] = useState('');
    const [loadingIntent, setLoadingIntent] = useState(false);

    useEffect(() => {
        const fetchIntent = async () => {
            setLoadingIntent(true);
            try {
                const response = await axios.post(`${API_BASE_URL}/subscription/create-stripe-intent/`, {
                    type_plan: plan
                });
                setClientSecret(response.data.client_secret);
            } catch (err) {
                console.error("Error creating payment intent:", err);
            } finally {
                setLoadingIntent(false);
            }
        };

        if (plan) {
            fetchIntent();
        }
    }, [plan]);

    const handleSuccess = (message) => {
        alert(message || "Paiement Stripe validé !");
        window.location.href = '/';
    };

    if (loadingIntent) {
        return (
            <div className="flex items-center justify-center p-6 text-gray-400">
                <Loader2 className="animate-spin mr-2" size={20} />
                Initialisation du paiement sécurisé...
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="text-red-400 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-sm text-center">
                Impossible d'initialiser Stripe. Vérifiez la connexion au serveur.
            </div>
        );
    }

    return (
        <div className="w-full">
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: document.documentElement.classList.contains('dark') ? 'night' : 'stripe' } }}>
                <CheckoutForm clientSecret={clientSecret} userId={userId} plan={plan} onSuccess={handleSuccess} />
            </Elements>
            <div className="text-center mt-3 text-xs text-gray-500 flex items-center justify-center gap-1">
                Paiement sécurisé par <strong>Stripe</strong>
            </div>
        </div>
    );
};

export default StripeCheckout;
