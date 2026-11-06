import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, Download, MessageCircle, X } from 'lucide-react';
import logger from '../utils/logger';
import { paymentService } from '../services/paymentService';
import { formatCurrency, formatDate } from '../services/formatService';
import { generatePaymentReminder, generateStatementPDF, openWhatsApp } from '../utils/whatsappHelper';
import { showToast } from '../utils/toastService';
import PaymentModal from './PaymentModal';
import './ClientDebtModals.css';

const paymentMethods = { cash: 'Espèces', mobile_money: 'Mobile Money', card: 'Carte', transfer: 'Virement', credit: 'Crédit' };

export default function ClientDetailModal({ client, userId, accountName, onClose, onClientUpdated }) {
  const [debts, setDebts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const balance = debts.reduce((sum, debt) => sum + Number(debt.balance_due || 0), 0);

  const loadDetails = useCallback(async () => {
    const [debtsResult, paymentsResult] = await Promise.all([
      paymentService.getClientDebts(userId, client.id),
      paymentService.getClientPayments(userId, client.id),
    ]);
    if (debtsResult.error || paymentsResult.error) {
      const loadError = debtsResult.error || paymentsResult.error;
      logger.error('Erreur chargement fiche de créances:', loadError);
      setError('Impossible de charger les créances ou les paiements. Vérifiez que la migration créances a été exécutée.');
    }
    setDebts(debtsResult.data || []);
    setPayments(paymentsResult.data || []);
    setLoading(false);
  }, [client.id, userId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => { loadDetails(); }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadDetails]);

  async function handlePaymentSuccess() {
    setShowPayment(false);
    setLoading(true);
    await loadDetails();
    await onClientUpdated();
  }

  function sendReminder() {
    if (!debts.length) {
      showToast('Ce client n’a aucune vente impayée.', 'error');
      return;
    }
    openWhatsApp(client.phone, generatePaymentReminder(client, debts, accountName));
  }

  function downloadStatement() {
    try {
      generateStatementPDF(client, debts, payments, accountName);
      showToast('Relevé PDF téléchargé', 'success');
    } catch (pdfError) {
      logger.error('Erreur génération relevé client:', pdfError);
      showToast('Impossible de générer le relevé PDF.', 'error');
    }
  }

  return (
    <>
      <div className="modal-overlay client-debt-overlay" onClick={onClose}>
        <div className="modal-content client-debt-modal client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="client-detail-title" onClick={(event) => event.stopPropagation()}>
          <div className="client-debt-heading">
            <div><h2 id="client-detail-title">{client.name}</h2><span className={`debt-badge ${balance > 0 ? 'debt-badge-due' : 'debt-badge-clear'}`}>{balance > 0 ? 'À régler' : 'À jour'}</span></div>
            <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
          </div>
          <div className={`client-debt-total ${balance > 0 ? 'has-debt' : 'no-debt'}`}><span>Solde dû</span><strong>{formatCurrency(balance)}</strong></div>
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? <div className="loading">Chargement de la fiche...</div> : (
            <div className="client-detail-content">
              <section>
                <h3>Détail des dettes</h3>
                {!debts.length ? <p className="debt-empty">Aucune vente impayée.</p> : (
                  <div className="debt-table-wrap"><table className="debt-table"><thead><tr><th>Vente</th><th>Date</th><th>Total</th><th>Payé</th><th>Reste</th><th>Statut</th></tr></thead><tbody>
                    {debts.map((debt) => (
                      <tr key={debt.id}>
                        <td data-label="Vente">{debt.reference || `#${debt.id}`}</td>
                        <td data-label="Date">{formatDate(debt.sale_date)}</td>
                        <td data-label="Total">{formatCurrency(debt.total_amount)}</td>
                        <td data-label="Payé">{formatCurrency(debt.paid_amount)}</td>
                        <td data-label="Reste"><strong>{formatCurrency(debt.balance_due)}</strong></td>
                        <td data-label="Statut"><span className={`payment-status-badge ${debt.payment_status === 'partial' ? 'partial' : 'unpaid'}`}>{debt.payment_status === 'partial' ? 'Partiel' : 'Impayé'}</span></td>
                      </tr>
                    ))}
                  </tbody></table></div>
                )}
              </section>
              <section>
                <h3>Historique des paiements</h3>
                {!payments.length ? <p className="debt-empty">Aucun paiement enregistré.</p> : (
                  <div className="debt-table-wrap"><table className="debt-table"><thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Référence</th></tr></thead><tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td data-label="Date">{formatDate(payment.payment_date)}</td>
                        <td data-label="Montant"><strong>{formatCurrency(payment.amount)}</strong></td>
                        <td data-label="Mode">{paymentMethods[payment.method] || payment.method}</td>
                        <td data-label="Référence">{payment.reference || payment.sales?.reference || payment.allocations?.map((item) => item.sales?.reference).filter(Boolean).join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody></table></div>
                )}
              </section>
            </div>
          )}
          <div className="client-debt-actions">
            <button type="button" className="btn btn-primary" onClick={() => setShowPayment(true)} disabled={loading || balance <= 0}><Banknote size={17} /> Encaisser un paiement</button>
            <button type="button" className="btn btn-secondary" onClick={sendReminder} disabled={loading || balance <= 0}><MessageCircle size={17} /> Rappel WhatsApp</button>
            <button type="button" className="btn btn-secondary" onClick={downloadStatement} disabled={loading}><Download size={17} /> Relevé PDF</button>
          </div>
        </div>
      </div>
      {showPayment && <PaymentModal client={client} userId={userId} debts={debts} onClose={() => setShowPayment(false)} onSuccess={handlePaymentSuccess} />}
    </>
  );
}