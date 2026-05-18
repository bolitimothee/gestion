/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import SearchBar from '../components/SearchBar';
import { Plus, Trash2, AlertCircle, TrendingUp, TrendingDown, DollarSign, Download, Mail, Share2, Edit2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../services/formatService';
import './Finances.css';

export default function Finances() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [_searchTerm, setSearchTerm] = useState('');
  const [_selectedCategory, setSelectedCategory] = useState('');
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

    if (expensesRes.data) {
      setExpenses(expensesRes.data);
      setFilteredExpenses(expensesRes.data);
    }
    if (summaryRes.data) setSummary(summaryRes.data);
    setLoading(false);
  }, [user]);

  // Get unique categories for filter
  const getCategories = useCallback(() => {
    const categories = [...new Set(expenses.map(expense => expense.category).filter(Boolean))];
    return categories.map(category => ({ value: category, label: category }));
  }, [expenses]);

  // Handle search and filter
  const handleSearch = useCallback((search, category) => {
    setSearchTerm(search);
    setSelectedCategory(category);
    
    let filtered = expenses;
    
    // Filter by search term
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(searchLower) ||
        expense.category.toLowerCase().includes(searchLower) ||
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
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await financeService.updateExpense(editingId, formData);
      } else {
        await financeService.addExpense(user.id, formData);
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
    } catch {
      // erreur ignorée
      setError(editingId ? 'Erreur lors de la modification de la dépense' : 'Erreur lors de l\'ajout de la dépense');
    }
  }

  async function handleDelete(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense?')) {
      try {
        const result = await financeService.deleteExpense(id);
        if (result.error) {
          setError('Erreur lors de la suppression de la dépense: ' + result.error.message);
          return;
        }
        await loadData();
      } catch (error) {
        setError('Erreur lors de la suppression de la dépense: ' + error.message);
      }
    }
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

  function downloadHistorique() {
    const content = generateHistoriqueText();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `historique_depenses_${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function generateHistoriqueText() {
    let text = `HISTORIQUE DES DÉPENSES\n`;
    text += `Entreprise: Commerce\n`;
    text += `Date d'export: ${new Date().toLocaleString('fr-FR')}\n`;
    text += `${'='.repeat(80)}\n\n`;

    expenses.forEach((expense) => {
      text += `Date: ${formatDate(expense.date)}\n`;
      text += `Description: ${expense.description}\n`;
      text += `Catégorie: ${expense.category}\n`;
      text += `Montant: ${formatCurrency(expense.amount)}\n`;
      text += `Notes: ${expense.notes || 'Aucune'}\n`;
      text += `${'-'.repeat(40)}\n`;
    });

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    text += `\nTOTAL DES DÉPENSES: ${formatCurrency(total)}\n`;
    text += `Nombre de dépenses: ${expenses.length}\n`;

    return text;
  }

  function shareViaWhatsApp() {
    const content = generateHistoriqueText();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(content)}`;
    window.open(whatsappUrl, '_blank');
  }

  function shareViaMail() {
    const content = generateHistoriqueText();
    const subject = `Historique des dépenses - ${new Date().toISOString().split('T')[0]}`;
    const body = content;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/finances" />
        <main className="main-content">
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
                    <span className="form-hint">Montant de la dépense en euros</span>
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
              <div className="expenses-table">
                {filteredExpenses.length > 0 && (
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
                {expenses.length > 0 ? (
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
        </main>
      </div>
    </div>
  );
}
