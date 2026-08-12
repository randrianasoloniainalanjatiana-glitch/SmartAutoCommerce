export const parseOrderDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  if (!str) return null;

  // Timestamps PostgreSQL sans fuseau : interprétés en heure locale (évite le décalage UTC).
  const pgMatch = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?(?:Z|[+-]\d{2}:\d{2})?$/
  );
  if (pgMatch && !/[+-]\d{2}:\d{2}$/.test(str) && !str.endsWith('Z')) {
    const local = new Date(
      Number(pgMatch[1]),
      Number(pgMatch[2]) - 1,
      Number(pgMatch[3]),
      Number(pgMatch[4]),
      Number(pgMatch[5]),
      Number.parseFloat(pgMatch[6] || '0')
    );
    return Number.isNaN(local.getTime()) ? null : local;
  }

  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const parseOrderAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).replace(/\s/g, '').replace(',', '.');
  const amount = Number.parseFloat(normalized);
  return Number.isNaN(amount) ? 0 : amount;
};

export const formatOrderDate = (value, options = {}) => {
  const d = parseOrderDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
};

export const formatOrderDateTime = (value) => {
  const d = parseOrderDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Clé date locale YYYY-MM-DD (évite le décalage UTC de toISOString). */
export const toLocalDateKey = (value) => {
  const d = value instanceof Date ? value : parseOrderDate(value);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const localDateKeyToLabel = (key) => {
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
};

export const getOrderReference = (order) => {
  if (!order) return '—';
  const num = order.num_facture;
  if (num !== null && num !== undefined && String(num).trim() !== '') {
    return String(num).trim();
  }
  return `#${order.id ?? '—'}`;
};

export const getOrderReferenceSortValue = (order) => {
  const ref = getOrderReference(order);
  if (ref.startsWith('#')) {
    const parsed = parseInt(ref.slice(1), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return ref.toLowerCase();
};

export const isOrderPaid = (order) =>
  (order?.statut_paiement || '').toLowerCase() === 'paye';

export const getPaidOrders = (orders) => (orders || []).filter(isOrderPaid);

/** Commandes prises en compte dans le graphique d'évolution (hors annulées). */
export const getOrdersForRevenueChart = (orders) =>
  (orders || []).filter((order) => (order?.statut_livraison || '').toLowerCase() !== 'annule');

export const formatPaymentStatus = (status) => {
  const value = (status || '').toLowerCase();
  if (value === 'paye') return 'Payé';
  if (value === 'non_paye') return 'Non payé';
  return status || 'Non payé';
};
