/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { Plus, Trash2, AlertCircle, Download, Share2, Mail, Search, Filter, Calendar, DollarSign, TrendingDown, TrendingUp, PieChart, BarChart3, Receipt } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import './Finances.css';

const formatFCFA = (amount) => {
  if (!isFinite(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
};

// Composant pour la carte de dépense
const ExpenseCard = ({ expense, onEdit, onDelete }) => {
  const expenseDate = new Date(expense.date);
  const isToday = expenseDate.toDateString() === new Date().toDateString();
  
  const getCategoryIcon = (category) => {
    const icons = {
      'Alimentation': '🍔',
      'Transport': '🚗',
      'Logement': '🏠',
      'Santé': '💊',
      'Éducation': '📚',
      'Divertissement': '🎮',
      'Shopping': '🛍️',
      'Autre': '📌'
    };
    return icons[category] || '📌';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Alimentation': '#ef4444',
      'Transport': '#3b82f6',
      'Logement': '#10b981',
      'Santé': '#f59e0b',
      'Éducation': '#8b5cf6',
      'Divertissement': '#ec4899',
      'Shopping': '#06b6d4',
      'Autre': '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div className="expense-card">
      <div className="expense-header">
        <div className="expense-category">
          <span 
            className="category-icon" 
            style={{ backgroundColor: getCategoryColor(expense.category) }}
          >
            {getCategoryIcon(expense.category)}
          </span>
          <div className="category-info">
            <span className="category-name">{expense.category}</span>
            <span className={`expense-date ${isToday ? 'today' : ''}`}>
              {isToday ? "Aujourd'hui" : formatDate(expense.date)}
            </span>
          </div>
        </div>
        <div className="expense-amount">
          <span className="amount-value">-{formatFCFA(expense.amount)}</span>
        </div>
      </div>
      
      <div className="expense-content">
        <div className="expense-description">
          <h4>{expense.description}</h4>
          {expense.notes && (
            <p className="expense-notes">{expense.notes}</p>
          )}
        </div>
      </div>
      
      <div className="expense-actions">
        <button
          onClick={() => onEdit(expense)}
          className="action-btn btn-edit"
          title="Modifier la dépense"
        >
          <TrendingDown size={16} />
          <span>Modifier</span>
        </button>
        <button
          onClick={() => onDelete(expense.id)}
          className="action-btn btn-delete"
          title="Supprimer la dépense"
        >
          <Trash2 size={16} />
          <span>Supprimer</span>
        </button>
      </div>
    </div>
  );
};

// Composant pour les statistiques financières
const FinancialStats = ({ summary, expenses }) => {
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const todayExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.toDateString() === new Date().toDateString();
  }).reduce((sum, expense) => sum + expense.amount, 0);

  // Calculer les dépenses par catégorie
  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

  const topCategory = Object.entries(expensesByCategory).length > 0 
    ? Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0]
    : ['Autre', 0];

  return (
    <div className="financial-stats">
      <div className="stat-card">
        <div className="stat-icon expense">
          <TrendingDown size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{formatFCFA(totalExpenses)}</span>
          <span className="stat-label">Total Dépenses</span>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon average">
          <BarChart3 size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{formatFCFA(avgExpense)}</span>
          <span className="stat-label">Dépense Moyenne</span>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon today">
          <Calendar size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{formatFCFA(todayExpenses)}</span>
          <span className="stat-label">Dépenses Aujourd'hui</span>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon category">
          <PieChart size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{topCategory[0]}</span>
          <span className="stat-label">Catégorie Principale</span>
        </div>
      </div>
    </div>
  );
};

export default function Finances() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: 'Autre',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const categories = [
    'Alimentation',
    'Transport', 
    'Logement',
    'Santé',
    'Éducation',
    'Divertissement',
    'Shopping',
    'Autre'
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expensesRes, summaryRes] = await Promise.all([
        financeService.getExpenses(user.id),
        financeService.getFinancialSummary(user.id),
      ]);

      if (expensesRes.data) setExpenses(expensesRes.data);
      if (summaryRes.data) setSummary(summaryRes.data);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Filtrer les dépenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = searchTerm === '' || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === '' || expense.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!formData.description.trim()) {
      setError('La description est obligatoire');
      return;
    }
    if (formData.amount <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }
    if (!formData.category) {
      setError('La catégorie est obligatoire');
      return;
    }

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingId) {
        const result = await financeService.updateExpense(editingId, expenseData);
        if (result.error) throw result.error;
      } else {
        const result = await financeService.addExpense(user.id, expenseData);
        if (result.error) throw result.error;
      }

      setFormData({
        description: '',
        amount: 0,
        category: 'Autre',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err.message || 'Erreur lors de l\'ajout de la dépense');
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

  async function handleDelete(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense?')) {
      try {
        await financeService.deleteExpense(id);
        await loadData();
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        setError('Erreur lors de la suppression de la dépense');
      }
    }
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
    text += `Date d'export: ${new Date().toLocaleString('fr-FR')}\n`;
    text += `${'='.repeat(80)}\n\n`;

    filteredExpenses.forEach((expense) => {
      text += `Date: ${formatDate(expense.date)}\n`;
      text += `Catégorie: ${expense.category}\n`;
      text += `Description: ${expense.description}\n`;
      text += `Montant: ${formatFCFA(expense.amount)}\n`;
      text += `Notes: ${expense.notes || 'Aucune'}\n`;
      text += `${'-'.repeat(80)}\n\n`;
    });

    text += `${'='.repeat(80)}\n`;
    text += `Total dépenses: ${filteredExpenses.length}\n`;
    text += `Montant total: ${formatFCFA(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}\n`;

    return text;
  }

  function shareViaWhatsApp() {
    const text = generateHistoriqueText();
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  }

  function shareViaMail() {
    const text = generateHistoriqueText();
    const subject = `Historique des dépenses - ${new Date().toISOString().split('T')[0]}`;
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  return (
    <Layout activeRoute="/finances">
      <div className="finances-page">
        {/* Header */}
        <div className="finances-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Gestion Financière</h1>
              <p>Suivi de vos dépenses et analyse financière</p>
            </div>
            <div className="header-actions">
              <button 
                onClick={() => setShowForm(!showForm)} 
                className="btn-primary"
              >
                <Plus size={18} />
                {showForm ? 'Masquer le formulaire' : 'Ajouter une dépense'}
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="expense-form-section">
            <div className="form-container">
              <div className="form-header">
                <h2>{editingId ? 'Modifier la dépense' : 'Enregistrer une nouvelle dépense'}</h2>
                <button 
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="btn-close"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="expense-form">
                {/* Section Informations principales */}
                <div className="form-section">
                  <h3 className="section-title">
                    <span className="section-number">1</span>
                    Informations de la dépense
                  </h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="description" className="form-label">
                        Description <span className="required">*</span>
                      </label>
                      <input
                        id="description"
                        type="text"
                        className="form-input"
                        placeholder="Ex: Courses au supermarché, Essence pour la voiture..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                      />
                      <span className="form-hint">Description claire de la dépense</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="amount" className="form-label">
                        Montant <span className="required">*</span>
                      </label>
                      <div className="input-with-currency">
                        <input
                          id="amount"
                          type="number"
                          className="form-input"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                          step="0.01"
                          min="0"
                          required
                        />
                        <span className="currency">FCFA</span>
                      </div>
                      <span className="form-hint">Montant de la dépense</span>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="category" className="form-label">
                        Catégorie <span className="required">*</span>
                      </label>
                      <select
                        id="category"
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <span className="form-hint">Catégorie pour organiser vos dépenses</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="date" className="form-label">
                        Date <span className="required">*</span>
                      </label>
                      <input
                        id="date"
                        type="date"
                        className="form-input"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                      <span className="form-hint">Date de la dépense</span>
                    </div>
                  </div>
                </div>

                {/* Section Notes */}
                <div className="form-section">
                  <h3 className="section-title">
                    <span className="section-number">2</span>
                    Notes additionnelles
                  </h3>
                  
                  <div className="form-group full-width">
                    <label htmlFor="notes" className="form-label">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      className="form-textarea"
                      placeholder="Détails supplémentaires, référence, remarques..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="3"
                    />
                    <span className="form-hint">Informations additionnelles sur la dépense</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                  <div className="actions-left">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                      }}
                      className="btn-secondary"
                    >
                      Annuler
                    </button>
                  </div>
                  <div className="actions-right">
                    <button type="submit" className="btn-primary">
                      {editingId ? (
                        <>
                          <TrendingDown size={16} />
                          Mettre à jour la dépense
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Enregistrer la dépense
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Statistiques */}
        {!loading && expenses.length > 0 && (
          <div className="stats-section">
            <FinancialStats summary={summary} expenses={filteredExpenses} />
          </div>
        )}

        {/* Filtres et recherche */}
        {!loading && expenses.length > 0 && (
          <div className="filters-section">
            <div className="filters-container">
              <div className="search-group">
                <div className="search-input-wrapper">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Rechercher par description, catégorie ou notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              
              <div className="filter-group">
                <div className="filter-input-wrapper">
                  <Filter size={18} />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="export-actions">
                <button onClick={downloadHistorique} className="btn-secondary" title="Télécharger l'historique">
                  <Download size={16} />
                  Télécharger
                </button>
                <button onClick={shareViaWhatsApp} className="btn-secondary" title="Partager via WhatsApp">
                  <Share2 size={16} />
                  WhatsApp
                </button>
                <button onClick={shareViaMail} className="btn-secondary" title="Envoyer par e-mail">
                  <Mail size={16} />
                  Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="error-container">
            <div className="error-content">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button onClick={() => setError('')} className="btn-close-error">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Contenu principal */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des données financières...</p>
          </div>
        ) : (
          <div className="finances-content">
            <div className="finances-layout">
              {/* Liste des dépenses */}
              <div className="expenses-list-section">
                <div className="section-header">
                  <h2>
                    <Receipt size={20} />
                    Dépenses Enregistrées
                  </h2>
                  <span className="expenses-count">
                    {filteredExpenses.length} dépense{filteredExpenses.length > 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="expenses-grid">
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))
                  ) : (
                    <div className="empty-expenses">
                      <Receipt size={48} />
                      <h3>Aucune dépense enregistrée</h3>
                      <p>
                        {searchTerm || selectedCategory 
                          ? 'Aucune dépense ne correspond à vos critères de recherche' 
                          : 'Commencez à suivre vos dépenses pour voir vos transactions ici'
                        }
                      </p>
                      {!searchTerm && !selectedCategory && (
                        <button onClick={() => setShowForm(true)} className="btn-primary">
                          <Plus size={16} />
                          Enregistrer votre première dépense
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
