import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatOrderDateTime, getOrderReference } from './orderUtils';

const COLORS = {
  cyan: [6, 182, 212],
  slate900: [17, 24, 39],
  slate700: [55, 65, 81],
  slate500: [107, 114, 128],
  slate200: [229, 231, 235],
  slate50: [249, 250, 251],
  white: [255, 255, 255],
  green: [22, 163, 74],
  greenBg: [240, 253, 244],
  red: [220, 38, 38],
  redBg: [254, 242, 242],
  yellow: [202, 138, 4],
  yellowBg: [254, 249, 195],
  grayBg: [243, 244, 246],
};

function formatStatus(value) {
  return String(value || 'en attente').replace(/_/g, ' ').toUpperCase();
}

function getStatusColors(type, value) {
  const normalized = String(value || '').toLowerCase();
  if (type === 'payment') {
    if (normalized === 'paye') return { text: COLORS.green, bg: COLORS.greenBg };
    return { text: COLORS.red, bg: COLORS.redBg };
  }
  if (normalized === 'livre') return { text: COLORS.green, bg: COLORS.greenBg };
  if (normalized === 'en_cours') return { text: COLORS.yellow, bg: COLORS.yellowBg };
  return { text: COLORS.slate700, bg: COLORS.grayBg };
}

function drawSectionTitle(doc, title, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.slate900);
  doc.text(title, x, y);
}

function drawField(doc, label, value, x, y, maxWidth = 82) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate500);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate900);
  const lines = doc.splitTextToSize(String(value || '—'), maxWidth);
  doc.text(lines, x, y + 5);
  return y + 5 + lines.length * 4.5;
}

function drawStatusBadge(doc, label, value, x, y) {
  const type = label.includes('Paiement') ? 'payment' : 'delivery';
  const colors = getStatusColors(type, value);
  const text = formatStatus(value);
  const badgeWidth = Math.max(28, doc.getTextWidth(text) + 8);

  doc.setFillColor(...colors.bg);
  doc.setDrawColor(...colors.text);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y - 4.5, badgeWidth, 7, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...colors.text);
  doc.text(text, x + 4, y);
}

export function downloadInvoicePdf({ commande, details, livreurInfo, currencySymbol = '' }) {
  if (!commande) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFillColor(...COLORS.cyan);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  doc.text('FACTURE', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Commande ${getOrderReference(commande)}`, margin, 21);
  doc.text(formatOrderDateTime(commande.created_at), pageWidth - margin, 21, { align: 'right' });

  y = 36;

  const clientBoxHeight = 34;
  doc.setFillColor(...COLORS.slate50);
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, clientBoxHeight, 3, 3, 'FD');
  drawSectionTitle(doc, 'Informations Client', margin + 5, y + 8);

  const leftX = margin + 5;
  const rightX = margin + contentWidth / 2;
  drawField(doc, 'Nom', commande.nom, leftX, y + 14, contentWidth / 2 - 10);
  drawField(doc, 'Telephone', commande.telephone, rightX, y + 14, contentWidth / 2 - 10);
  drawField(doc, 'Adresse', commande.adresse, leftX, y + 26, contentWidth - 10);

  y += clientBoxHeight + 6;

  const livreurBoxHeight = livreurInfo ? 34 : 22;
  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(margin, y, contentWidth, livreurBoxHeight, 3, 3, 'FD');
  drawSectionTitle(doc, 'Informations Livreur', margin + 5, y + 8);

  if (livreurInfo) {
    drawField(
      doc,
      'Nom',
      [livreurInfo.prenom, livreurInfo.Nom].filter(Boolean).join(' '),
      leftX,
      y + 14,
      contentWidth / 2 - 10
    );
    drawField(doc, 'Telephone', livreurInfo.telephone, rightX, y + 14, contentWidth / 2 - 10);
    drawField(doc, 'Email', livreurInfo.email, leftX, y + 26, contentWidth - 10);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.slate700);
    doc.text("Aucun livreur n'est actuellement affecte a cette commande.", margin + 5, y + 16);
  }

  y += livreurBoxHeight + 8;

  drawSectionTitle(doc, 'Details des Produits', margin, y);
  y += 4;

  const tableBody = (details || []).map((detail) => {
    const qty = Number(detail.quantite_acheter || 0);
    const unitPrice = Number(detail.prix_unitaire || 0);
    const productName = detail.products?.name || 'Produit inconnu';
    const category = detail.products?.category ? `\n${detail.products.category}` : '';
    return [
      `${productName}${category}`,
      String(qty),
      `${unitPrice} ${currencySymbol}`.trim(),
      `${(qty * unitPrice).toFixed(2)} ${currencySymbol}`.trim(),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Produit', 'Quantite', 'Prix Unit.', 'Total']],
    body: tableBody.length > 0 ? tableBody : [['Aucun produit', '—', '—', '—']],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: COLORS.slate200,
      lineWidth: 0.2,
      textColor: COLORS.slate900,
      valign: 'middle',
    },
    headStyles: {
      fillColor: COLORS.slate50,
      textColor: COLORS.slate700,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 88 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: COLORS.slate50 },
    bodyStyles: { fillColor: COLORS.white },
    margin: { left: margin, right: margin },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 0 && data.cell.raw.includes('\n')) {
        data.cell.text = data.cell.raw.split('\n');
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  doc.setDrawColor(...COLORS.slate200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate500);
  doc.text('Statut Livraison', margin, y);
  drawStatusBadge(doc, 'Statut Livraison', commande.statut_livraison, margin + 34, y);

  doc.text('Statut Paiement', margin, y + 10);
  drawStatusBadge(doc, 'Statut Paiement', commande.statut_paiement, margin + 34, y + 10);

  const totalLabelY = y - 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate500);
  doc.text('Montant Total', pageWidth - margin, totalLabelY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.slate900);
  doc.text(`${commande.montant_total} ${currencySymbol}`.trim(), pageWidth - margin, totalLabelY + 8, { align: 'right' });

  y += 24;
  doc.setDrawColor(...COLORS.slate200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate500);
  doc.text('Date de commande', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate700);
  doc.text(formatOrderDateTime(commande.created_at), margin, y + 5);

  const fileName = `facture-${getOrderReference(commande).replace(/[^\w-]+/g, '-')}.pdf`;
  doc.save(fileName);
}
