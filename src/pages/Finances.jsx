/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import { useExpensesSync } from '../hooks/useRealtimeSync';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import { Plus, Trash2, AlertCircle, Download, Share2, Mail } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import './Finances.css';

const formatFCFA = (amount) => {
  if (!isFinite(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
};

export default function Finances() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [expensesRes, summaryRes] = await Promise.all([
      financeService.getExpenses(user.id),
      financeService.getFinancialSummary(user.id),
    ]);

    if (expensesRes.data) setExpenses(expensesRes.data);
    if (summaryRes.data) setSummary(summaryRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Synchroniser les dépenses en temps réel
  useExpensesSync(user?.id, setExpenses);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      await financeService.addExpense(user.id, formData);
      setFormData({
        description: '',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setShowForm(false);
      await loadData();
    } catch {
      // erreur ignorée
      setError('Erreur lors de l\'ajout de la dépense');
    }
  }

  async function handleDelete(expenseId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense?')) {
      try {
        const result = await financeService.deleteExpense(expenseId);
        if (result.error) throw result.error;
        await loadData();
      } catch (err) {
        console.error('Erreur suppression:', err);
        setError('Erreur lors de la suppression de la dépense');
      }
    }
  }

  function downloadHistorique() {
    const content = generateHistoriqueDepensesText();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `historique_depenses_${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function generateHistoriqueDepensesText() {
    let text = `HISTORIQUE DES DÉPENSES\n`;
    text += `Entreprise: ${user?.email || 'Commerce'}\n`;
    text += `Date d'export: ${new Date().toLocaleString('fr-FR')}\n`;
    text += `${'='.repeat(80)}\n\n`;

    expenses.forEach((expense) => {
      text += `Date: ${formatDate(expense.date)}\n`;
      text += `Description: ${expense.description}\n`;
      text += `Catégorie: ${expense.category}\n`;
      text += `Montant: ${formatFCFA(expense.amount)}\n`;
      text += `Remarques: ${expense.notes || 'Aucune'}\n`;
      text += `${'-'.repeat(80)}\n\n`;
    });

    text += `${'='.repeat(80)}\n`;
    text += `Total dépenses: ${expenses.length}\n`;
    text += `Montant total: ${formatFCFA(expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0))}\n`;
    if (summary) {
      text += `\nRÉSUMÉ FINANCIER:\n`;
      text += `Chiffre d'Affaires: ${formatFCFA(summary.totalRevenue)}\n`;
      text += `Dépenses Totales: ${formatFCFA(summary.totalExpenses)}\n`;
      text += `Bénéfice Net: ${formatFCFA(summary.netProfit)}\n`;
    }

    return text;
  }

  function shareViaWhatsApp() {
    const text = generateHistoriqueDepensesText();
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  }

  function shareViaMail() {
    const text = generateHistoriqueDepensesText();
    const subject = `Historique des dépenses - ${new Date().toISOString().split('T')[0]}`;
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/finances" />
        <main className="main-content">
          <div className="page-header">
            <h1>Rapports Financiers</h1>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              <Plus size={20} />
              Ajouter une dépense
            </button>
          </div>

          {!loading && summary && (
            <div className="stats-grid">
              <StatCard
                title="Chiffre d'Affaires"
                value={formatFCFA(summary.totalRevenue)}
                icon={TrendingUp}
                color="blue"
              />
              <StatCard
                title="Dépenses Totales"
                value={formatFCFA(summary.totalExpenses)}
                icon={TrendingDown}
                color="orange"
              />
              <StatCard
                title="Bénéfice Net"
                value={formatFCFA(summary.netProfit)}
                icon={DollarSign}
                color={summary.netProfit >= 0 ? 'green' : 'purple'}
              />
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading">Chargement des données financières...</div>
          ) : (
            <div className="finances-layout">
              {/* HISTORIQUE À GAUCHE */}
              <div className="expenses-history-section">
                <div className="expenses-container">
                  {expenses.length > 0 && (
                    <div className="export-actions">
                      <button onClick={downloadHistorique} className="btn btn-secondary btn-sm" title="Télécharger l'historique">
                        <Download size={20} />
                        Télécharger
                      </button>
                      <button onClick={shareViaWhatsApp} className="btn btn-secondary btn-sm" title="Partager via WhatsApp">
                        <Share2 size={20} />
                        WhatsApp
                      </button>
                      <button onClick={shareViaMail} className="btn btn-secondary btn-sm" title="Envoyer par e-mail">
                        <Mail size={20} />
                        Email
                      </button>
                    </div>
                  )}

                  <div className="expenses-table">
                    {expenses.length > 0 ? (
                      <div className="table-responsive">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Description</th>
                              <th>Catégorie</th>
                              <th>Montant</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses.map((expense) => (
                              <tr key={expense.id}>
                                <td data-label="Date">{formatDate(expense.date)}</td>
                                <td data-label="Description">{expense.description}</td>
                                <td data-label="Catégorie">{expense.category}</td>
                                <td data-label="Montant" className="amount">{formatFCFA(expense.amount)}</td>
                                <td className="actions-cell" data-label="Actions">
                                  <button
                                    onClick={() => handleDelete(expense.id)}
                                    className="btn btn-sm btn-delete"
                                    title="Supprimer"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="empty-message">Aucune dépense enregistrée</p>
                    )}
                  </div>
                </div>
              </div>

              {/* FORMULAIRE À DROITE */}
              {showForm && (
                <div className="expenses-form-section">
                  <div className="form-card">
                    <h2>Ajouter une dépense</h2>
                    <form onSubmit={handleSubmit}>
                      <div className="form-group">
                        <label>Description</label>
                        <input
                          type="text"
                          placeholder="Description de la dépense"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Catégorie</label>
                        <input
                          type="text"
                          placeholder="Ex: Fournitures, Transport..."
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Montant (FCFA)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Remarques</label>
                        <textarea
                          placeholder="Remarques optionnelles"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows="4"
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="btn btn-secondary"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
