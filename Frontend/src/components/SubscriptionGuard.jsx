import React, { useEffect, useState, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';
import WelcomeSubscription from '../pages/WelcomeSubscription';

const API_BASE_URL = "http://localhost:8000/api";

export const SubscriptionContext = createContext();
export const useSubscription = () => useContext(SubscriptionContext);

const SubscriptionGuard = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const [subStatus, setSubStatus] = useState(null);
    const [isChecking, setIsChecking] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const location = useLocation();

    // Get user from localStorage because context might not provide id directly
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?.id;

    useEffect(() => {
        if (!isAuthenticated || loading || !userId) {
            if (!loading) setIsChecking(false);
            return;
        }

        const checkSubscription = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/subscription/status/${userId}/?t=${new Date().getTime()}`);
                setSubStatus(response.data);
            } catch (error) {
                console.error("Error checking subscription", error);
            } finally {
                setIsChecking(false);
            }
        };

        checkSubscription();
    }, [isAuthenticated, userId, loading]);

    useEffect(() => {
        const handleShowModal = () => setShowModal(true);
        window.addEventListener('show-subscription-modal', handleShowModal);
        return () => window.removeEventListener('show-subscription-modal', handleShowModal);
    }, []);

    if (loading || isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return children;
    }

    const isExpired = subStatus?.statut === 'expire';
    const hasNoSubscription = subStatus?.status === 'no_subscription';
    const isRestricted = hasNoSubscription || isExpired;

    return (
        <SubscriptionContext.Provider value={{ isRestricted, subStatus }}>
            {children}

            {showModal && isRestricted && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="relative w-full max-w-4xl my-8">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute -top-12 right-0 text-gray-500 hover:text-gray-800 dark:text-white dark:hover:text-gray-300 z-50 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg"
                        >
                            <X size={24} />
                        </button>
                        <div className="bg-white dark:bg-gray-950 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
                            <WelcomeSubscription />
                        </div>
                    </div>
                </div>
            )}
        </SubscriptionContext.Provider>
    );
};

export default SubscriptionGuard;
