/**
 * apiConfig.js — Configuration centralisée des URLs API
 *
 * Utilise window.location.hostname pour détecter automatiquement l'IP
 * du serveur. Quand l'utilisateur accède via http://192.168.x.x:5173,
 * les appels API iront vers http://192.168.x.x:8000 et :5000.
 * En local, ça reste "localhost".
 */

const API_HOST = window.location.hostname;

// Backend Django (port 8000)
export const DJANGO_API = `http://${API_HOST}:8000/api`;

// Backend Flask — Amazon Dashboard (port 5000)
export const FLASK_API = `http://${API_HOST}:5000`;
