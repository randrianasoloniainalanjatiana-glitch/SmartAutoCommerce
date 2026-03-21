import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useCurrency, CurrencyDisplay } from '../components/CurrencyDisplay';

const CurrencyDemo = () => {
  const { currentCurrency, currentSymbol, getCurrencySymbol } = useSettings();
  const { formatAmount, formatInputPlaceholder } = useCurrency();
  
  const demoPrices = [10, 25.50, 99.99, 150, 999.99];
  const currencies = ['EUR', 'USD', 'GBP', 'XOF', 'MGA', 'MUR', 'ZAR', 'NGN'];
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
          Démonstration des Symboles Monétaires
        </h1>
        
        {/* Informations actuelles */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Configuration Actuelle
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Devise actuelle</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentCurrency}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Symbole actuel</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currentSymbol}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Exemple de formatage</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatAmount(1234.56)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Démo des prix */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Exemples de Prix
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {demoPrices.map((price, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                <CurrencyDisplay 
                  amount={price} 
                  className="text-lg font-bold text-indigo-600 dark:text-indigo-400"
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Démo des devises */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Symboles des Devises Supportées
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {currencies.map((currency) => (
              <div key={currency} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{currency}</span>
                <span className="font-bold text-gray-800 dark:text-white">
                  {getCurrencySymbol(currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-400 mb-3">
            Comment utiliser
          </h3>
          <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>• Allez dans <strong>Paramètres</strong> pour modifier votre devise</p>
            <p>• Entrez un code de devise (ex: EUR, USD, XOF, MGA)</p>
            <p>• Les symboles se mettront à jour automatiquement dans toute l'application</p>
            <p>• Les prix dans les produits, commandes et formulaires utiliseront le bon symbole</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyDemo;
