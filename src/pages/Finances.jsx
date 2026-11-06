import React, { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import SearchBar from '../components/SearchBar';
import { Plus, Trash2, AlertCircle, TrendingDown, Edit2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../services/formatService';
import { showToast } from '../utils/toastService';
import ExportMenu from '../components/ExportMenu';
import './Finances.css';

export default function Finances() {
  const { user, account } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, expenseId: null, description: '' });
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [expensesRes, summaryRes] = await Promise.allSettled([
        financeService.getExpenses(user.id),
        financeService.getFinancialSummary(user.id),
      ]);
      const expensesResult = expensesRes.status === 'fulfilled' ? expensesRes.value : null;
      const summaryResult = summaryRes.status === 'fulfilled' ? summaryRes.value : null;

      if (expensesResult?.data) {
        setExpenses(expensesResult.data);
        setFilteredExpenses(expensesResult.data);
      } else {
        setExpenses([]);
        setFilteredExpenses([]);
        if (expensesResult?.error) {
          logger.error('Erreur financeService.getExpenses:', expensesResult.error);
        }
      }

      if (summaryResult?.data) {
        setSummary(summaryResult.data);
      } else if (summaryResult?.error) {
        logger.error('Erreur financeService.getFinancialSummary:', summaryResult.error);
      }

      if (!expensesResult?.data && !summaryResult?.data) {
        setError('Erreur lors du chargement des données financières.');
      }
    } catch (error) {
      logger.error('Erreur chargement données Finances:', error);
      setError(error.message || 'Erreur lors du chargement des données financières.');
      setExpenses([]);
      setFilteredExpenses([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get unique categories for filter
  const getCategories = useCallback(() => {
    const categories = [...new Set(expenses.map(expense => expense.category).filter(Boolean))];
    return categories.map(category => ({ value: category, label: category }));
  }, [expenses]);

  // Handle search and filter
  const handleSearch = useCallback((search, category) => {
    let filtered = expenses;
    
    // Filter by search term
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.category?.toLowerCase().includes(searchLower) ||
        expense.notes?.toLowerCase().includes(searchLower) ||
        formatDate(expense.date).includes(search) ||
        formatCurrency(expense.amount).includes(search)
      );
    }
    
    // Filter by category
    if (category) {
      filtered = filtered.filter(expense => expense.category === category);
    }
    
    setFilteredExpenses(filtered);
  }, [expenses]);

  useEffect(() => {
    if (!user) return undefined;

    (async () => {
      try {
        await loadData();
      } catch (e) {
        logger.error('Erreur chargement données Finances:', e);
      }
    })();

    return undefined;
  }, [user, loadData]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        const result = await financeService.updateExpense(editingId, formData);
        if (result.error) {
          setError(result.error.message || 'Impossible de modifier la dépense.');
          return;
        }
        showToast('Dépense mise à jour avec succès', 'success');
      } else {
        const result = await financeService.addExpense(user.id, formData);
        if (result.error) {
          setError(result.error.message || 'Impossible d’ajouter la dépense.');
          return;
        }
        showToast('Dépense ajoutée avec succès', 'success');
      }
      
      setFormData({
        description: '',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (error) {
      logger.error('Erreur handleSubmit dépenses:', error);
      setError(editingId ? 'Erreur lors de la modification de la dépense' : 'Erreur lors de l\'ajout de la dépense');
    }
  }

  async function handleDelete(id) {
    const expense = expenses.find(e => e.id === id);
    setDeleteConfirm({ show: true, expenseId: id, description: expense?.description || '' });
  }

  async function confirmDelete() {
    if (deleteConfirm.expenseId) {
      try {
        const result = await financeService.deleteExpense(deleteConfirm.expenseId);
        if (result.error) {
          setError('Erreur lors de la suppression de la dépense: ' + result.error.message);
          return;
        }
        showToast('Dépense supprimée avec succès', 'success');
        setDeleteConfirm({ show: false, expenseId: null, description: '' });
        await loadData();
      } catch (error) {
        setError('Erreur lors de la suppression de la dépense: ' + error.message);
      }
    }
  }

  function cancelDelete() {
    setDeleteConfirm({ show: false, expenseId: null, description: '' });
  }

  function handleEdit(expense) {
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      notes: expense.notes || '',
    });
    setEditingId(expense.id);
    setShowForm(true);
  }

  const exportRows = filteredExpenses.map((expense) => ({
    date: formatDate(expense.date),
    description: expense.description,
    category: expense.category,
    amount: expense.amount,
  }));

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/finances" />
        <main className="main-content finances-page">
          <div className="page-header">
            <div className="page-header-content">
              <h1>Rapports Financiers</h1>
              <SearchBar
                placeholder="Rechercher une dépense par description, catégorie, montant..."
                onSearch={handleSearch}
                filters={getCategories()}
                showFilters={true}
                className="finances-search-bar"
              />
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-add">
              <Plus size={20} />
              Ajouter une dépense
            </button>
          </div>

          {!loading && summary && (
            <div className="stats-grid">
              <StatCard
                title="Dépenses Totales"
                value={formatCurrency(summary.totalExpenses)}
                icon={TrendingDown}
                color="orange"
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
            <div className="form-card app-form-card">
              <h2>{editingId ? 'Modifier la dépense' : 'Enregistrer une nouvelle dépense'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="description">Description *</label>
                    <input
                      id="description"
                      type="text"
                      placeholder="Ex: Loyer mensuel, Achat de matériel..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                    <span className="form-hint">Description détaillée de la dépense</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="category">Catégorie *</label>
                    <input
                      id="category"
                      type="text"
                      placeholder="Ex: Loyer, Fournitures, Salaires..."
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    />
                    <span className="form-hint">Catégorie pour organiser les dépenses</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="amount">Montant *</label>
                    <input
                      id="amount"
                      type="number"
                      placeholder="Ex: 1500.00"
                      value={formData.amount || ''}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setFormData({ ...formData, amount: 0 });
                          return;
                        }
                        const value = Number(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          setFormData({ ...formData, amount: Math.round(value * 100) / 100 });
                        }
                      }}
                      step="0.01"
                      min="0"
                      required
                    />
                    <span className="form-hint">Montant de la dépense en FCFA</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="date">Date *</label>
                    <input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                    <span className="form-hint">Date à laquelle la dépense a été effectuée</span>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="notes">Notes (optionnel)</label>
                  <textarea
                    id="notes"
                    placeholder="Informations supplémentaires sur la dépense..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                  />
                  <span className="form-hint">Détails ou remarques additionnelles</span>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    {editingId ? 'Mettre à jour' : 'Enregistrer la dépense'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData({
                        description: '',
                        amount: 0,
                        category: '',
                        date: new Date().toISOString().split('T')[0],
                        notes: '',
                      });
                    }}
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
              {filteredExpenses.length > 0 && (
                <div className="export-actions">
                  <ExportMenu
                    data={exportRows}
                    columns={[
                      { key: 'date', label: 'Date' },
                      { key: 'description', label: 'Description' },
                      { key: 'category', label: 'Catégorie' },
                      { key: 'amount', label: 'Montant' },
                    ]}
                    filename="historique_depenses"
                    title="Historique des dépenses"
                    whatsappPhone=""
                    email=""
                    accountName={account?.account_name || 'Commerce'}
                  />
                </div>
              )}
              <div className="expenses-table">
                {filteredExpenses.length > 0 ? (
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Heure</th>
                          <th>Description</th>
                          <th>Catégorie</th>
                          <th>Montant</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((expense) => {
                          // Extraire l'heure de la date ou utiliser '--' si non disponible
                          const expenseTime = expense.date ? new Date(expense.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--';
                          return (
                            <tr key={expense.id}>
                              <td data-label="Date">{formatDate(expense.date)}</td>
                              <td data-label="Heure">{expenseTime}</td>
                              <td data-label="Description">{expense.description}</td>
                              <td data-label="Catégorie">{expense.category}</td>
                              <td data-label="Montant" className="amount">{formatCurrency(expense.amount)}</td>
                              <td className="actions-cell" data-label="Actions">
                                <button
                                  onClick={() => handleEdit(expense)}
                                  className="btn btn-sm btn-edit"
                                  title="Modifier"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(expense.id)}
                                  className="btn btn-sm btn-delete"
                                  title="Supprimer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-message">Aucune dépense enregistrée</p>
                )}
              </div>
            </div>
          )}

          {deleteConfirm.show && (
            <div className="modal-overlay" onClick={cancelDelete}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Confirmer la suppression</h3>
                <p>Êtes-vous sûr de vouloir supprimer la dépense "{deleteConfirm.description}" ?</p>
                <p className="modal-warning">Cette action est irréversible.</p>
                <div className="modal-actions">
                  <button onClick={confirmDelete} className="btn btn-danger">Supprimer</button>
                  <button onClick={cancelDelete} className="btn btn-secondary">Annuler</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
