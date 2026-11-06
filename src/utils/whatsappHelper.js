import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from '../services/formatService';

const getDebtBalance = (debts) => debts.reduce((sum, debt) => sum + Number(debt.balance_due || 0), 0);

export function generatePaymentReminder(client, debts, accountName) {
  const balance = getDebtBalance(debts);
  const debtLines = debts.map((debt) => (
    `- ${debt.reference || `Vente #${debt.id}`} du ${formatDate(debt.sale_date)} : ${formatCurrency(debt.balance_due)}`
  ));

  return [
    `Bonjour ${client.name},`,
    '',
    `Petit rappel amical : il vous reste ${formatCurrency(balance)} à régler au titre de ${debts.length} vente(s) :`,
    ...debtLines,
    '',
    'Merci !',
    `- ${accountName || 'Votre commerce'}`,
  ].join('\n');
}

export function openWhatsApp(phone, message) {
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function generateStatementPDF(client, debts, payments, accountName) {
  const document = new jsPDF();
  const balance = getDebtBalance(debts);

  document.setTextColor(0, 49, 82);
  document.setFontSize(17);
  document.text(accountName || 'Commerce', 14, 18);
  document.setFontSize(10);
  document.setTextColor(70, 80, 90);
  document.text(`Relevé client • ${formatDate(new Date())}`, 14, 26);
  document.text(`Client : ${client.name}`, 14, 36);
  document.text(`Téléphone : ${client.phone || 'Non renseigné'}`, 14, 43);
  document.text(`Adresse : ${client.address || 'Non renseignée'}`, 14, 50);

  document.setFontSize(13);
  document.setTextColor(0, 49, 82);
  document.text('Ventes impayées', 14, 62);
  autoTable(document, {
    startY: 66,
    head: [['Référence', 'Date', 'Total', 'Payé', 'Reste']],
    body: debts.length ? debts.map((debt) => [
      debt.reference || `Vente #${debt.id}`,
      formatDate(debt.sale_date),
      formatCurrency(debt.total_amount),
      formatCurrency(debt.paid_amount),
      formatCurrency(debt.balance_due),
    ]) : [['Aucune vente impayée', '', '', '', '']],
    headStyles: { fillColor: [0, 49, 82] },
    styles: { fontSize: 8 },
  });

  const paymentsTitleY = (document.lastAutoTable?.finalY || 72) + 12;
  document.setFontSize(13);
  document.setTextColor(0, 49, 82);
  document.text('Paiements reçus', 14, paymentsTitleY);
  autoTable(document, {
    startY: paymentsTitleY + 4,
    head: [['Date', 'Montant', 'Mode', 'Référence']],
    body: payments.length ? payments.map((payment) => [
      formatDate(payment.payment_date),
      formatCurrency(payment.amount),
      payment.method,
      payment.reference || payment.sales?.reference || payment.allocations?.map((item) => item.sales?.reference).filter(Boolean).join(', ') || '-',
    ]) : [['Aucun paiement reçu', '', '', '']],
    headStyles: { fillColor: [0, 49, 82] },
    styles: { fontSize: 8 },
  });

  const balanceY = (document.lastAutoTable?.finalY || paymentsTitleY + 12) + 12;
  if (balanceY > document.internal.pageSize.getHeight() - 15) document.addPage();
  document.setFontSize(12);
  document.setTextColor(balance > 0 ? 180 : 20, balance > 0 ? 40 : 120, balance > 0 ? 40 : 70);
  document.text(`Solde dû : ${formatCurrency(balance)}`, 14, balanceY > document.internal.pageSize.getHeight() - 15 ? 20 : balanceY);
  document.save(`releve_${String(client.name || 'client').trim().replace(/[^\w-]+/g, '_')}.pdf`);
}