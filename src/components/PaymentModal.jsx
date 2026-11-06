import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { formatCurrency } from '../services/formatService';
import { showToast } from '../utils/toastService';
import './ClientDebtModals.css';

const today = new Date().toISOString().slice(0, 10);

export default function PaymentModal({ client, userId, debts, onClose, onSuccess }) {
  const totalDue = debts.reduce((sum, debt) => sum + Number(debt.balance_due || 0), 0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const parsedAmount = Number(amount) || 0;
  const allocationPreview = useMemo(() => {
    return debts.reduce((allocation, debt) => {
      const applied = Math.min(allocation.remaining, Number(debt.balance_due || 0));
      return {
        remaining: Math.max(0, allocation.remaining - applied),
        rows: [...allocation.rows, { ...debt, applied }],
      };
    }, { remaining: parsedAmount, rows: [] }).rows;
  }, [debts, parsedAmount]);

  function setQuickAmount(percentage) {
    setAmount((Math.round(totalDue * percentage * 100) / 100).toString());
  }

  async function submitPayment(event) {
    event.preventDefault();
    setError('');
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > totalDue) {
      setError('Le montant doit être supérieur à 0 et ne pas dépasser le solde dû.');
      return;
    }

    setSaving(true);
    const result = await paymentService.registerPayment(userId, client.id, {
      amount: parsedAmount,
      method,
      reference,
      paymentDate,
      notes,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message || 'Impossible d’enregistrer cet encaissement.');
      return;
    }

    const newBalance = Number(result.data?.new_client_balance ?? Math.max(0, totalDue - parsedAmount));
    showToast(`${formatCurrency(parsedAmount)} encaissés • Nouveau solde : ${formatCurrency(newBalance)}`, 'success');
    await onSuccess();
  }

  return (
    <div className="modal-overlay client-debt-overlay" onClick={onClose}>
      <div className="modal-content client-debt-modal payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="client-debt-heading">
          <h2 id="payment-modal-title">Encaisser • {client.name}</h2>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </div>
        <div className="client-debt-total"><span>Solde dû actuel</span><strong>{formatCurrency(totalDue)}</strong></div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submitPayment}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="payment-amount">Montant reçu *</label>
              <input id="payment-amount" aria-describedby="payment-amount-hint" type="number" min="0.01" max={totalDue} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              <span className="form-hint" id="payment-amount-hint">Saisissez le montant reçu, sans dépasser le solde dû.</span>
              <div className="payment-shortcuts" aria-label="Montant rapide">
                {[0.25, 0.5, 1].map((percentage) => <button key={percentage} type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickAmount(percentage)}>{percentage * 100}%</button>)}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="payment-method">Mode de paiement *</label>
              <select id="payment-method" aria-describedby="payment-method-hint" value={method} onChange={(event) => setMethod(event.target.value)}>
                <option value="cash">Espèces</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="card">Carte</option>
                <option value="transfer">Virement</option>
              </select>
              <span className="form-hint" id="payment-method-hint">Choisissez le moyen utilisé pour cet encaissement.</span>
            </div>
            <div className="form-group">
              <label htmlFor="payment-date">Date *</label>
              <input id="payment-date" aria-describedby="payment-date-hint" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
              <span className="form-hint" id="payment-date-hint">Date de réception du paiement.</span>
            </div>
            <div className="form-group full-width">
              <label htmlFor="payment-reference">Référence</label>
              <input id="payment-reference" aria-describedby="payment-reference-hint" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="N° Wave, OM..." />
              <span className="form-hint" id="payment-reference-hint">Ajoutez le numéro de transaction, si disponible.</span>
            </div>
            <div className="form-group full-width">
              <label htmlFor="payment-notes">Notes</label>
              <textarea id="payment-notes" aria-describedby="payment-notes-hint" rows="2" value={notes} onChange={(event) => setNotes(event.target.value)} />
              <span className="form-hint" id="payment-notes-hint">Informations complémentaires sur cet encaissement.</span>
            </div>
          </div>
          <section className="allocation-preview" aria-live="polite">
            <h3>Aperçu de la répartition (FIFO)</h3>
            {allocationPreview.map((debt) => <div className="allocation-row" key={debt.id}><span>{debt.reference || `Vente #${debt.id}`}</span><strong>{formatCurrency(debt.applied)}</strong></div>)}
            <div className="allocation-new-balance"><span>Nouveau solde après paiement</span><strong>{formatCurrency(Math.max(0, totalDue - parsedAmount))}</strong></div>
          </section>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || parsedAmount <= 0 || parsedAmount > totalDue}>{saving ? 'Enregistrement...' : 'Valider l’encaissement'}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}