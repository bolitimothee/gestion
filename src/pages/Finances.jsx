/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import './Finances.css';

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

  async function handleDelete() {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense?')) {
      await loadData();
    }
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
                value={formatCurrency(summary.totalRevenue)}
                icon={TrendingUp}
                color="blue"
              />
              <StatCard
                title="Dépenses Totales"
                value={formatCurrency(summary.totalExpenses)}
                icon={TrendingDown}
                color="orange"
              />
              <StatCard
                title="Bénéfice Net"
                value={formatCurrency(summary.netProfit)}
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

          {showForm && (
            <div className="form-card">
              <h2>Enregistrer une nouvelle dépense</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <input
                    type="text"
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Catégorie"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Montant"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    step="0.01"
                    required
                  />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <textarea
                  placeholder="Remarques (optionnel)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Enregistrer la dépense
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
          )}

          {loading ? (
            <div className="loading">Chargement des données financières...</div>
          ) : (
            <div className="expenses-container">
              <h2>Historique des Dépenses</h2>
              <div className="expenses-table">
                {expenses.length > 0 ? (
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
                          <td>{formatDate(expense.date)}</td>
                          <td>{expense.description}</td>
                          <td>{expense.category}</td>
                          <td className="amount">{formatCurrency(expense.amount)}</td>
                          <td>
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
                ) : (
                  <p className="empty-message">Aucune dépense enregistrée</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
