/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { salesService } from '../services/salesService';
import { stockService } from '../services/stockService';
import Layout from '../components/Layout';
import { Plus, Edit2, Trash2, AlertCircle, Download, Mail, Share2, Search, Filter, Calendar, User, Package, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import './Sales.css';

const formatFCFA = (amount) => {
  if (!isFinite(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
};

// Composant pour la carte de vente
const SaleCard = ({ sale, product, onEdit, onDelete }) => {
  const saleDate = new Date(sale.sale_date);
  const isToday = saleDate.toDateString() === new Date().toDateString();
  
  return (
    <div className="sale-card">
      <div className="sale-header">
        <div className="sale-date">
          <Calendar size={16} />
          <span className={`date-text ${isToday ? 'today' : ''}`}>
            {isToday ? "Aujourd'hui" : formatDate(sale.sale_date)}
          </span>
          {sale.sale_time && (
            <span className="time-text">
              <Clock size={14} />
              {sale.sale_time}
            </span>
          )}
        </div>
        <div className="sale-amount">
          <span className="amount-value">{formatFCFA(sale.total_amount)}</span>
        </div>
      </div>
      
      <div className="sale-content">
        <div className="sale-customer">
          <User size={16} />
          <span>{sale.customer_name}</span>
        </div>
        
        <div className="sale-product">
          <Package size={16} />
          <span>{product?.name || 'Produit supprimé'}</span>
        </div>
        
        <div className="sale-quantity">
          <span className="quantity-label">Quantité:</span>
          <span className="quantity-value">{sale.quantity}</span>
        </div>
        
        {sale.notes && (
          <div className="sale-notes">
            <p>{sale.notes}</p>
          </div>
        )}
      </div>
      
      <div className="sale-actions">
        <button
          onClick={() => onEdit(sale)}
          className="action-btn btn-edit"
          title="Modifier la vente"
        >
          <Edit2 size={16} />
          <span>Modifier</span>
        </button>
        <button
          onClick={() => onDelete(sale.id)}
          className="action-btn btn-delete"
          title="Supprimer la vente"
        >
          <Trash2 size={16} />
          <span>Supprimer</span>
        </button>
      </div>
    </div>
  );
};

// Composant pour les statistiques de ventes
const SalesStats = ({ sales, products }) => {
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
  const todaySales = sales.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    return saleDate.toDateString() === new Date().toDateString();
  }).length;
  
  return (
    <div className="sales-stats">
      <div className="stat-card">
        <div className="stat-icon">
          <TrendingUp size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{totalSales}</span>
          <span className="stat-label">Total Ventes</span>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">
          <DollarSign size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{formatFCFA(totalRevenue)}</span>
          <span className="stat-label">Chiffre d'Affaires</span>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">
          <Package size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{formatFCFA(avgSaleValue)}</span>
          <span className="stat-label">Panier Moyen</span>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">
          <Calendar size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{todaySales}</span>
          <span className="stat-label">Ventes Aujourd'hui</span>
        </div>
      </div>
    </div>
  );
};

export default function Sales() {
  const { user, account } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    customer_name: '',
    sale_date: new Date().toISOString().split('T')[0],
    sale_time: new Date().toTimeString().slice(0, 5),
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes] = await Promise.all([
        salesService.getSales(user.id),
        stockService.getProducts(user.id),
      ]);

      if (salesRes.data) setSales(salesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
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

  // Filtrer les ventes
  const filteredSales = sales.filter(sale => {
    const product = products.find(p => p.id === sale.product_id);
    const matchesSearch = searchTerm === '' || 
      sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProduct = selectedProduct === '' || sale.product_id === parseInt(selectedProduct);
    
    return matchesSearch && matchesProduct;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!formData.product_id) {
      setError('Veuillez sélectionner un produit');
      return;
    }
    if (!formData.customer_name.trim()) {
      setError('Le nom du client est obligatoire');
      return;
    }
    if (formData.quantity <= 0) {
      setError('La quantité doit être supérieure à 0');
      return;
    }

    try {
      const product = products.find((p) => p.id === parseInt(formData.product_id));
      
      if (!product) {
        setError('Produit non trouvé');
        return;
      }

      const quantity = parseFloat(formData.quantity) || 0;
      const unitPrice = parseFloat(product.selling_price) || 0;
      
      if (quantity <= 0) {
        setError('Quantité invalide');
        return;
      }
      
      if (unitPrice <= 0) {
        setError('Prix unitaire invalide');
        return;
      }

      const saleData = {
        ...formData,
        product_id: parseInt(formData.product_id),
        unit_price: unitPrice,
        quantity: quantity,
      };

      if (editingId) {
        const result = await salesService.updateSale(editingId, saleData);
        if (result.error) throw result.error;
      } else {
        const result = await salesService.addSale(user.id, saleData);
        if (result.error) throw result.error;
      }

      setFormData({
        product_id: '',
        quantity: 1,
        unit_price: 0,
        customer_name: '',
        sale_date: new Date().toISOString().split('T')[0],
        sale_time: new Date().toTimeString().slice(0, 5),
        notes: '',
      });
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err.message || 'Erreur lors de l\'ajout de la vente');
    }
  }

  function handleEdit(sale) {
    setFormData({
      product_id: sale.product_id,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      customer_name: sale.customer_name,
      sale_date: sale.sale_date,
      sale_time: sale.sale_time || '',
      notes: sale.notes,
    });
    setEditingId(sale.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette vente?')) {
      try {
        await salesService.deleteSale(id);
        await loadData();
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        setError('Erreur lors de la suppression de la vente');
      }
    }
  }

  function downloadHistorique() {
    const content = generateHistoriqueText();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `historique_ventes_${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function generateHistoriqueText() {
    let text = `HISTORIQUE DES VENTES\n`;
    text += `Entreprise: ${account?.business_name || 'Commerce'}\n`;
    text += `Date d'export: ${new Date().toLocaleString('fr-FR')}\n`;
    text += `${'='.repeat(80)}\n\n`;

    filteredSales.forEach((sale) => {
      const product = products.find(p => p.id === sale.product_id);
      text += `Date: ${formatDate(sale.sale_date)}\n`;
      text += `Client: ${sale.customer_name}\n`;
      text += `Produit: ${product?.name || 'Produit supprimé'}\n`;
      text += `Quantité: ${sale.quantity}\n`;
      text += `Montant: ${formatFCFA(sale.total_amount)}\n`;
      text += `Notes: ${sale.notes || 'Aucune'}\n`;
      text += `${'-'.repeat(80)}\n\n`;
    });

    text += `${'='.repeat(80)}\n`;
    text += `Total ventes: ${filteredSales.length}\n`;
    text += `Montant total: ${formatFCFA(filteredSales.reduce((sum, s) => sum + s.total_amount, 0))}\n`;

    return text;
  }

  function shareViaWhatsApp() {
    const text = generateHistoriqueText();
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  }

  function shareViaMail() {
    const text = generateHistoriqueText();
    const subject = `Historique des ventes - ${new Date().toISOString().split('T')[0]}`;
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  return (
    <Layout activeRoute="/sales">
      <div className="sales-page">
        {/* Header */}
        <div className="sales-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Gestion des Ventes</h1>
              <p>Suivi et enregistrement de vos transactions commerciales</p>
            </div>
            <div className="header-actions">
              <button 
                onClick={() => setShowForm(!showForm)} 
                className="btn-primary"
              >
                <Plus size={18} />
                {showForm ? 'Masquer le formulaire' : 'Ajouter une vente'}
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="sales-form-section">
            <div className="form-container">
              <div className="form-header">
                <h2>{editingId ? 'Modifier la vente' : 'Enregistrer une nouvelle vente'}</h2>
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
              
              <form onSubmit={handleSubmit} className="sales-form">
                {/* Section Informations principales */}
                <div className="form-section">
                  <h3 className="section-title">
                    <span className="section-number">1</span>
                    Informations de la vente
                  </h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="product" className="form-label">
                        Produit <span className="required">*</span>
                      </label>
                      <select
                        id="product"
                        className="form-select"
                        value={formData.product_id}
                        onChange={(e) => {
                          const product = products.find((p) => p.id === e.target.value);
                          setFormData({
                            ...formData,
                            product_id: e.target.value,
                            unit_price: product?.selling_price || 0,
                          });
                        }}
                        required
                      >
                        <option value="">Sélectionner un produit</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatFCFA(product.selling_price)}
                          </option>
                        ))}
                      </select>
                      <span className="form-hint">Choisissez le produit vendu</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="quantity" className="form-label">
                        Quantité <span className="required">*</span>
                      </label>
                      <input
                        id="quantity"
                        type="number"
                        className="form-input"
                        placeholder="Ex: 2"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                        min="1"
                        required
                      />
                      <span className="form-hint">Nombre d'unités vendues</span>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="customer" className="form-label">
                        Nom du client <span className="required">*</span>
                      </label>
                      <input
                        id="customer"
                        type="text"
                        className="form-input"
                        placeholder="Ex: Jean Dupont"
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        required
                      />
                      <span className="form-hint">Nom ou identifiant du client</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="saleDate" className="form-label">
                        Date de vente <span className="required">*</span>
                      </label>
                      <input
                        id="saleDate"
                        type="date"
                        className="form-input"
                        value={formData.sale_date}
                        onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                        required
                      />
                      <span className="form-hint">Quand la vente s'est effectuée</span>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="saleTime" className="form-label">
                        Heure de vente
                      </label>
                      <input
                        id="saleTime"
                        type="time"
                        className="form-input"
                        value={formData.sale_time}
                        onChange={(e) => setFormData({ ...formData, sale_time: e.target.value })}
                      />
                      <span className="form-hint">À quelle heure la vente s'est effectuée</span>
                    </div>

                    {formData.product_id && (
                      <div className="form-group">
                        <label className="form-label">Prix unitaire</label>
                        <div className="price-display">
                          <span className="price-value">
                            {formatFCFA(formData.unit_price)}
                          </span>
                        </div>
                        <span className="form-hint">Prix du produit sélectionné</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Calculs */}
                {formData.product_id && formData.quantity > 0 && (
                  <div className="form-section">
                    <h3 className="section-title">
                      <span className="section-number">2</span>
                      Récapitulatif
                    </h3>
                    
                    <div className="calculation-preview">
                      <div className="calc-item">
                        <span className="calc-label">Quantité:</span>
                        <span className="calc-value">{formData.quantity}</span>
                      </div>
                      <div className="calc-item">
                        <span className="calc-label">Prix unitaire:</span>
                        <span className="calc-value">{formatFCFA(formData.unit_price)}</span>
                      </div>
                      <div className="calc-item total">
                        <span className="calc-label">Total:</span>
                        <span className="calc-value total-amount">
                          {formatFCFA(formData.quantity * formData.unit_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Notes */}
                <div className="form-section">
                  <h3 className="section-title">
                    <span className="section-number">3</span>
                    Notes additionnelles
                  </h3>
                  
                  <div className="form-group full-width">
                    <label htmlFor="notes" className="form-label">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      className="form-textarea"
                      placeholder="Remarques ou détails supplémentaires sur cette vente..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="3"
                    />
                    <span className="form-hint">Informations additionnelles sur la vente</span>
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
                          <Edit2 size={16} />
                          Mettre à jour la vente
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Enregistrer la vente
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
        {!loading && sales.length > 0 && (
          <div className="stats-section">
            <SalesStats sales={filteredSales} products={products} />
          </div>
        )}

        {/* Filtres et recherche */}
        {!loading && sales.length > 0 && (
          <div className="filters-section">
            <div className="filters-container">
              <div className="search-group">
                <div className="search-input-wrapper">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Rechercher par client ou produit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              
              <div className="filter-group">
                <div className="filter-input-wrapper">
                  <Package size={18} />
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Tous les produits</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
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
            <p>Chargement des ventes...</p>
          </div>
        ) : (
          <div className="sales-content">
            <div className="sales-layout">
              {/* Liste des ventes */}
              <div className="sales-list-section">
                <div className="section-header">
                  <h2>
                    <Package size={20} />
                    Ventes Enregistrées
                  </h2>
                  <span className="sales-count">
                    {filteredSales.length} vente{filteredSales.length > 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="sales-grid">
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale) => {
                      const product = products.find(p => p.id === sale.product_id);
                      return (
                        <SaleCard
                          key={sale.id}
                          sale={sale}
                          product={product}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      );
                    })
                  ) : (
                    <div className="empty-sales">
                      <Package size={48} />
                      <h3>Aucune vente enregistrée</h3>
                      <p>
                        {searchTerm || selectedProduct 
                          ? 'Aucune vente ne correspond à vos critères de recherche' 
                          : 'Commencez à vendre pour voir vos transactions ici'
                        }
                      </p>
                      {!searchTerm && !selectedProduct && (
                        <button onClick={() => setShowForm(true)} className="btn-primary">
                          <Plus size={16} />
                          Enregistrer votre première vente
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
