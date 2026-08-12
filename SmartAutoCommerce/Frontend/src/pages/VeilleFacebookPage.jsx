import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TrendingUp, DollarSign, BarChart3, ShoppingBag, Smartphone, ArrowLeftRight } from "lucide-react";
import BuzzTab from "../components/veille-facebook/BuzzTab";
import PrixEngagementTab from "../components/veille-facebook/PrixEngagementTab";
import TendancesTab from "../components/veille-facebook/TendancesTab";
import CatalogueTab from "../components/veille-facebook/CatalogueTab";
import DifferencePrixTab from "../components/veille-facebook/DifferencePrixTab";

const tabs = [
    { id: "buzz", label: "Buzz", icon: <TrendingUp size={16} /> },
    { id: "prix", label: "Prix & Engagement", icon: <DollarSign size={16} /> },
    { id: "differences", label: "Différences de prix", icon: <ArrowLeftRight size={16} /> },
    { id: "tendances", label: "Tendances", icon: <BarChart3 size={16} /> },
    { id: "catalogue", label: "Bilan Sourcing", icon: <ShoppingBag size={16} /> },
];

function VeilleFacebookPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get("tab");
    const historiqueFromUrl = searchParams.get("historique");
    const [activeTab, setActiveTab] = useState(
        tabs.some((t) => t.id === tabFromUrl) ? tabFromUrl : "buzz"
    );

    useEffect(() => {
        if (tabFromUrl && tabs.some((t) => t.id === tabFromUrl)) {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        const next = new URLSearchParams(searchParams);
        if (tabId === "buzz") {
            next.delete("tab");
            next.delete("historique");
        } else {
            next.set("tab", tabId);
            if (tabId !== "differences") {
                next.delete("historique");
            }
        }
        setSearchParams(next, { replace: true });
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 md:p-8 transition-colors">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-6 border-b border-gray-300 dark:border-gray-700 pb-6">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <Smartphone size={28} className="text-blue-500 shrink-0" />
                        Veille <span className="text-blue-500">Facebook</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Analyse concurrentielle basée sur les données Facebook — engagement, prix, différences, tendances et catalogue
                    </p>
                </div>

                {/* Onglets */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.id
                                ? "bg-blue-500 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200"
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Contenu de l'onglet actif */}
                {activeTab === "buzz" && <BuzzTab />}
                {activeTab === "prix" && <PrixEngagementTab />}
                {activeTab === "differences" && (
                    <DifferencePrixTab initialHistoriqueId={historiqueFromUrl} />
                )}
                {activeTab === "tendances" && <TendancesTab />}
                {activeTab === "catalogue" && <CatalogueTab />}

            </div>
        </div>
    );
}

export default VeilleFacebookPage;
