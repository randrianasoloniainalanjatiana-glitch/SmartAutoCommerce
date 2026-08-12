/**
 * Service API pour la Veille Concurrentielle Facebook.
 * Utilise axios comme le reste du projet (Dashboard.jsx, etc.).
 */

import axios from 'axios';
import { DJANGO_API } from '../config/apiConfig';

const API_BASE = `${DJANGO_API}/veille-facebook`;

const getUserId = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user?.id || null;
    } catch {
        return null;
    }
};

const withUserId = (params = {}) => {
    const userId = getUserId();
    return userId ? { ...params, user_id: userId } : params;
};

// ─── Buzz ───────────────────────────────────────────────────
export const fetchBuzzList = async (params = {}) => {
    const response = await axios.get(`${API_BASE}/buzz/`, { params: withUserId(params) });
    return response.data;
};

export const fetchBuzzStats = async () => {
    const response = await axios.get(`${API_BASE}/buzz/stats/`, { params: withUserId() });
    return response.data;
};

// ─── Prix ───────────────────────────────────────────────────
export const fetchPrixGrille = async () => {
    const response = await axios.get(`${API_BASE}/prix/`, { params: withUserId() });
    return response.data;
};

export const fetchPrixFourchette = async (categorie) => {
    const response = await axios.get(`${API_BASE}/prix/${encodeURIComponent(categorie)}/`, { params: withUserId() });
    return response.data;
};

// ─── Engagement ─────────────────────────────────────────────
export const fetchEngagementConcurrents = async () => {
    const response = await axios.get(`${API_BASE}/engagement/concurrents/`, { params: withUserId() });
    return response.data;
};

export const fetchEngagementCategories = async () => {
    const response = await axios.get(`${API_BASE}/engagement/categories/`, { params: withUserId() });
    return response.data;
};

export const fetchEngagementPrix = async () => {
    const response = await axios.get(`${API_BASE}/engagement/prix/`, { params: withUserId() });
    return response.data;
};

// ─── Tendances ──────────────────────────────────────────────
export const fetchTendancesFrequence = async () => {
    const response = await axios.get(`${API_BASE}/tendances/frequence/`, { params: withUserId() });
    return response.data;
};

export const fetchTendancesLancements = async (jours = 30) => {
    const response = await axios.get(`${API_BASE}/tendances/lancements/`, { params: withUserId({ jours }) });
    return response.data;
};

export const fetchTendancesEmergents = async () => {
    const response = await axios.get(`${API_BASE}/tendances/emergents/`, { params: withUserId() });
    return response.data;
};

// ─── Catalogue ──────────────────────────────────────────────
export const fetchCatalogueOpportunites = async () => {
    const response = await axios.get(`${API_BASE}/catalogue/opportunites/`, { params: withUserId() });
    return response.data;
};

export const fetchCatalogueStars = async () => {
    const response = await axios.get(`${API_BASE}/catalogue/stars/`, { params: withUserId() });
    return response.data;
};

export const fetchCatalogueEviter = async () => {
    const response = await axios.get(`${API_BASE}/catalogue/eviter/`, { params: withUserId() });
    return response.data;
};

// ─── Historique comparaisons de prix ────────────────────────
export const fetchHistoriqueComparaisons = async () => {
    const response = await axios.get(`${API_BASE}/historique/comparaisons/`, { params: withUserId() });
    return response.data;
};
