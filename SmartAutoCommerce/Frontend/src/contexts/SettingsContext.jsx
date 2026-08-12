import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { DJANGO_API } from '../config/apiConfig';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [parametres, setParametres] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParametres = async () => {
      const paramUserId =
        user?.role === 'livreur'
          ? (user?.id_utilisateur || user?.utilisateur_id)
          : user?.id;

      if (!paramUserId) {
        setParametres(null);
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${DJANGO_API}/parametres/${paramUserId}/`);
        if (response.data) {
          setParametres(response.data);
        } else {
          setParametres(null);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des paramètres:", error);
        setParametres(null);
      } finally {
        setLoading(false);
      }
    };
    fetchParametres();
  }, [user?.id, user?.role, user?.id_utilisateur, user?.utilisateur_id]);

  // Fonction pour obtenir le symbole monétaire selon la devise
  const getCurrencySymbol = (devise) => {
    const symbols = {
      'EUR': '€',
      'USD': '$',
      'GBP': '£',
      'JPY': '¥',
      'CHF': 'CHF',
      'CAD': 'C$',
      'AUD': 'A$',
      'CNY': '¥',
      'INR': '₹',
      'XOF': 'FCFA',
      'XAF': 'FCFA',
      'XOF': 'FCFA',
      'MGA': 'Ar',
      'MUR': 'Rs',
      'ZAR': 'R',
      'NGN': '₦',
      'GHS': 'GH₵',
      'KES': 'KSh',
      'UGX': 'UGX',
      'TZS': 'TSh',
      'RWF': 'RWF',
      'BIF': 'FBu',
      'DJF': 'Fdj',
      'ERN': 'Nfk',
      'SOS': 'S',
      'SDG': 'ج.س.',
      'LYD': 'ل.د',
      'TND': 'د.ت',
      'DZD': 'د.ج.',
      'MAD': 'د.م.',
      'EGP': 'ج.م.'
    };
    if (!devise) return '';
    return symbols[devise?.toUpperCase()] || devise;
  };

  const value = {
    parametres,
    loading,
    getCurrencySymbol,
    currentCurrency: parametres?.devise || '',
    currentSymbol: getCurrencySymbol(parametres?.devise)
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
