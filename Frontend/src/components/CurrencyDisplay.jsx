import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Composant pour afficher un montant avec le symbole monétaire dynamique
 * @param {number} amount - Le montant à afficher
 * @param {string} className - Classes CSS supplémentaires
 * @param {Object} props - Autres props à passer au span
 */
export const CurrencyDisplay = ({ amount, className = "", ...props }) => {
  const { currentSymbol } = useSettings();
  
  return (
    <span className={className} {...props}>
      {amount} {currentSymbol}
    </span>
  );
};

/**
 * Hook pour formater les montants avec la devise actuelle
 * @returns {Function} - Fonction de formatage
 */
export const useCurrency = () => {
  const { currentCurrency, currentSymbol } = useSettings();
  
  const formatAmount = (amount, options = {}) => {
    const {
      showSymbol = true,
      decimals = 2,
      locale = 'fr-FR'
    } = options;
    
    const formattedAmount = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount || 0);
    
    return showSymbol ? `${formattedAmount} ${currentSymbol}` : formattedAmount;
  };
  
  const formatInputPlaceholder = () => {
    return `Ex: 100 ${currentSymbol}`;
  };
  
  return {
    formatAmount,
    formatInputPlaceholder,
    currentCurrency,
    currentSymbol
  };
};

export default CurrencyDisplay;
