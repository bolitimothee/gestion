/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockService } from '../services/stockService';
import Layout from '../components/Layout';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import './Stock.css';

const formatFCFA = (amount) => {
  if (!isFinite(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
};

// Composant pour les jauges de stock
const StockGauge = ({ current, initial, threshold = 10 }) => {
  const percentage = initial > 0 ? Math.max(0, Math.min(100, (current / initial) * 100)) : 0;
  const stockLevel = current <= 0 ? 'empty' : current <= threshold ? 'critical' : current <= threshold * 2 ? 'low' : 'good';
  const soldPercentage = initial > 0 ? Math.min(100, ((initial - current) / initial) * 100) : 0;
  
  const getGaugeColor = (level) => {
    switch (level) {
      case 'empty': return '#dc2626';
      case 'critical': return '#ef4444';
      case 'low': return '#f59e0b';
      case 'good': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getGaugeGradient = (level) => {
    switch (level) {
      case 'empty': return 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)';
      case 'critical': return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
      case 'low': return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
      case 'good': return 'linear-gradient(90deg, #10b981 0%, #047857 100%)';
      default: return 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)';
    }
  };

  const getAlertMessage = (level, current, initial) => {
    switch (level) {
      case 'empty':
        return '🚨 STOCK ÉPUISÉ - Réapprovisionnement immédiat requis !';
      case 'critical':
        return `⚠️ STOCK CRITIQUE - Il ne reste que ${current} unité(s) !`;
      case 'low':
        return `📉 STOCK FAIBLE - ${current} unité(s) restantes`;
      default:
        return null;
    }
  };

  return (
    <div className="stock-gauge">
      <div className="gauge-header">
        <span className="gauge-title">Niveau de Stock</span>
        <span className={`gauge-status ${stockLevel}`}>
          {current}/{initial}
        </span>
      </div>
      
      <div className="gauge-container">
        <div className="gauge-track">
          <div 
            className="gauge-fill" 
            style={{ 
              width: `${percentage}%`,
              background: getGaugeGradient(stockLevel)
            }}
          ></div>
          {/* Indicateur de progression de vente */}
          {soldPercentage > 0 && (
            <div 
              className="sold-indicator" 
              style={{ 
                width: `${soldPercentage}%`,
                background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.1) 100%)'
              }}
            ></div>
          )}
        </div>
        <div className="gauge-percentage" style={{ color: getGaugeColor(stockLevel) }}>
          {Math.round(percentage)}%
        </div>
      </div>
      
      {/* Alertes visuelles sous la jauge */}
      {getAlertMessage(stockLevel, current, initial) && (
        <div className={`stock-alert ${stockLevel}`}>
          <div className="alert-icon">
            {stockLevel === 'empty' && '🚨'}
            {stockLevel === 'critical' && '⚠️'}
            {stockLevel === 'low' && '📉'}
          </div>
          <div className="alert-message">
            {getAlertMessage(stockLevel, current, initial)}
          </div>
        </div>
      )}
      
      <div className="gauge-indicators">
        <div className="indicator-item">
          <div className="indicator-dot empty"></div>
          <span>Épuisé (0)</span>
        </div>
        <div className="indicator-item">
          <div className="indicator-dot critical"></div>
          <span>Critique (≤{threshold})</span>
        </div>
        <div className="indicator-item">
          <div className="indicator-dot low"></div>
          <span>Bas (≤{threshold * 2})</span>
        </div>
        <div className="indicator-item">
          <div className="indicator-dot good"></div>
          <span>Bon ({`>${threshold * 2}`})</span>
        </div>
      </div>
    </div>
  );
};

const StockStatus = ({ product }) => {
  const initial = Number(product.initial_quantity ?? product.quantity ?? 0);
  const current = Number(product.quantity ?? 0);
  if (initial <= 0) return null;
  
  const sold = initial - current;
  const percentSold = Math.min(Math.max((sold / initial) * 100, 0), 100);
  let message = null;
  
  if (percentSold >= 100) {
    message = '✅ Vous avez vendu 100% du stock disponible de cet article.';
  } else if (percentSold >= 70) {
    message = `⚠️ Attention : plus de ${Math.round(percentSold)}% du stock est vendu. Stock restant : ${current}.`;
  }
  
  return (
    <>
      <div className="stock-progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percentSold}%` }}></div>
        </div>
        <div className="progress-label">{Math.round(percentSold)}% vendu</div>
      </div>
      {message && (
        <div className={`stock-warning ${percentSold >= 100 ? 'stock-empty' : 'stock-low'}`}>
          <AlertCircle size={16} style={{ marginRight: '6px' }} /> {message}
        </div>
      )}
    </>
  );
};

export default function Stock() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 0,
    purchase_price: 0,
    selling_price: 0,
    category: '',
    sku: '',
    initial_quantity: 0,
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await stockService.getProducts(user.id);
    if (error) {
      console.error('Erreur stockService:', error);
      setError('Erreur lors du chargement des produits.');
      setProducts([]);
    } else if (data) {
      setProducts(data || []);
    } else {
      setProducts([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user, loadProducts]);

  // Synchroniser les produits en temps réel - Désactivé temporairement
  // useProductsSync(user?.id, setProducts);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Le nom du produit est obligatoire');
      return;
    }
    if (!formData.category.trim()) {
      setError('La catégorie est obligatoire');
      return;
    }
    if (formData.purchase_price <= 0) {
      setError('Le prix d\'achat doit être supérieur à 0');
      return;
    }
    if (formData.selling_price <= 0) {
      setError('Le prix de revente doit être supérieur à 0');
      return;
    }
    if (formData.quantity <= 0) {
      setError('La quantité doit être supérieure à 0');
      return;
    }

    try {
      if (editingId) {
        await stockService.updateProduct(editingId, formData);
      } else {
        await stockService.addProduct(user.id, formData);
      }

      setFormData({
        name: '',
        description: '',
        quantity: 0,
        purchase_price: 0,
        selling_price: 0,
        category: '',
        sku: '',
        initial_quantity: 0,
      });
      setEditingId(null);
      setShowForm(false);
      await loadProducts();
    } catch {
      setError('Erreur lors de l\'ajout du produit');
    }
  }

  async function handleDelete(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
      await stockService.deleteProduct(id);
      await loadProducts();
    }
  }

  function handleEdit(product) {
    setFormData(product);
    setEditingId(product.id);
    setShowForm(true);
  }

  function handleCancel() {
    setFormData({
      name: '',
      description: '',
      quantity: 0,
      purchase_price: 0,
      selling_price: 0,
      category: '',
      sku: '',
      initial_quantity: 0,
    });
    setEditingId(null);
    setShowForm(false);
  }

  return (
    <Layout activeRoute="/stock">
      <div className="stock-page">
        <div className="page-header">
          <h1>Gestion des Stocks</h1>
          <div className="page-actions">
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              <Plus size={20} />
              Ajouter un produit
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {showForm && (
          <div className="form-container">
            <div className="form-header">
              <h2>{editingId ? 'Modifier le produit' : 'Ajouter un nouveau produit'}</h2>
              <button 
                onClick={handleCancel} 
                className="btn-close"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="product-form">
              {/* Section Informations principales */}
              <div className="form-section">
                <h3 className="section-title">
                  <span className="section-number">1</span>
                  Informations principales
                </h3>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="product-name" className="form-label">
                      Nom du Produit <span className="required">*</span>
                    </label>
                    <input
                      id="product-name"
                      type="text"
                      className="form-input"
                      placeholder="Ex: T-Shirt Blanc XL, iPhone 15 Pro, Café Arabica..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      autoFocus
                    />
                    <span className="form-hint">Nom ou description claire du produit</span>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category" className="form-label">
                      Catégorie <span className="required">*</span>
                    </label>
                    <input
                      id="category"
                      type="text"
                      className="form-input"
                      placeholder="Ex: Vêtements, Électronique, Alimentation..."
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                      list="categories"
                    />
                    <datalist id="categories">
                      <option value="Vêtements" />
                      <option value="Électronique" />
                      <option value="Alimentation" />
                      <option value="Cosmétiques" />
                      <option value="Livres" />
                      <option value="Maison" />
                      <option value="Sports" />
                      <option value="Autre" />
                    </datalist>
                    <span className="form-hint">Choisissez une catégorie pour organiser vos produits</span>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="sku" className="form-label">
                      Code SKU
                    </label>
                    <input
                      id="sku"
                      type="text"
                      className="form-input"
                      placeholder="Ex: SKU-2024-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                    <span className="form-hint">Code unique pour identifier le produit (optionnel)</span>
                  </div>
                </div>
              </div>

              {/* Section Prix et Stock */}
              <div className="form-section">
                <h3 className="section-title">
                  <span className="section-number">2</span>
                  Prix et Stock
                </h3>
                <div className="price-stock-grid">
                  <div className="price-group">
                    <div className="form-group">
                      <label htmlFor="purchase-price" className="form-label">
                        Prix d'Achat <span className="required">*</span>
                      </label>
                      <div className="input-with-currency">
                        <input
                          id="purchase-price"
                          type="number"
                          className="form-input"
                          placeholder="0.00"
                          value={formData.purchase_price}
                          onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                          step="0.01"
                          min="0"
                          required
                        />
                        <span className="currency">FCFA</span>
                      </div>
                      <span className="form-hint">Coût d'acquisition par unité</span>
                    </div>
                  </div>
                  
                  <div className="price-group">
                    <div className="form-group">
                      <label htmlFor="selling-price" className="form-label">
                        Prix de Revente <span className="required">*</span>
                      </label>
                      <div className="input-with-currency">
                        <input
                          id="selling-price"
                          type="number"
                          className="form-input"
                          placeholder="0.00"
                          value={formData.selling_price}
                          onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                          step="0.01"
                          min="0"
                          required
                        />
                        <span className="currency">FCFA</span>
                      </div>
                      <span className="form-hint">Prix de vente à vos clients</span>
                    </div>
                  </div>
                  
                  <div className="stock-group">
                    <div className="form-group">
                      <label htmlFor="quantity" className="form-label">
                        Quantité en Stock <span className="required">*</span>
                      </label>
                      <input
                        id="quantity"
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                        min="0"
                        required
                      />
                      <span className="form-hint">Nombre d'unités disponibles</span>
                    </div>
                  </div>
                </div>
                
                {/* Calcul automatique de la marge */}
                {formData.purchase_price > 0 && formData.selling_price > 0 && (
                  <div className="margin-preview">
                    <div className="margin-info">
                      <span className="margin-label">Marge unitaire:</span>
                      <span className="margin-value positive">
                        {formatFCFA(formData.selling_price - formData.purchase_price)}
                      </span>
                    </div>
                    <div className="margin-info">
                      <span className="margin-label">Pourcentage:</span>
                      <span className={`margin-value ${((formData.selling_price - formData.purchase_price) / formData.purchase_price * 100) >= 50 ? 'positive' : 'warning'}`}>
                        {Math.round(((formData.selling_price - formData.purchase_price) / formData.purchase_price) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section Description */}
              <div className="form-section">
                <h3 className="section-title">
                  <span className="section-number">3</span>
                  Description détaillée
                </h3>
                <div className="form-group full-width">
                  <label htmlFor="description" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="description"
                    className="form-textarea"
                    placeholder="Entrez les détails, caractéristiques, ou informations supplémentaires sur ce produit..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                  />
                  <span className="form-hint">Informations supplémentaires pour mieux décrire votre produit</span>
                </div>
              </div>

              {/* Actions du formulaire */}
              <div className="form-actions">
                <div className="actions-left">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
                <div className="actions-right">
                  <button type="submit" className="btn btn-primary">
                    {editingId ? (
                      <>
                        <Edit2 size={18} style={{ marginRight: '8px' }} />
                        Mettre à jour le produit
                      </>
                    ) : (
                      <>
                        <Plus size={18} style={{ marginRight: '8px' }} />
                        Ajouter le produit
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des produits...</p>
          </div>
        ) : (
          <>
            {/* Filtres et recherche */}
            <div className="products-filters">
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  className="search-input"
                />
              </div>
              <div className="filter-stats">
                <span className="stat-item">
                  <span className="stat-number">{products.length}</span>
                  <span className="stat-label">Produits</span>
                </span>
                <span className="stat-item">
                  <span className="stat-number">{products.filter(p => p.quantity <= 10).length}</span>
                  <span className="stat-label">Stock faible</span>
                </span>
              </div>
            </div>

            {/* Grille de produits */}
            <div className="products-grid-enhanced">
              {products.map((product) => (
                <div key={product.id} className="product-card-enhanced">
                  {/* Header du produit */}
                  <div className="product-header-enhanced">
                    <div className="product-title-section">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-category-badge">{product.category}</p>
                    </div>
                    <div className="product-stock-indicator">
                      <span className={`stock-badge-enhanced ${product.quantity > 10 ? 'in-stock' : 'low-stock'}`}>
                        {product.quantity} unités
                      </span>
                      <span className="sku-label">SKU: {product.sku || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Informations de stock avec visuel */}
                  <div className="stock-visual-section">
                    <StockGauge 
                      current={product.quantity} 
                      initial={product.initial_quantity ?? product.quantity} 
                      threshold={10}
                    />
                    <StockStatus product={product} />
                    <div className="stock-summary">
                      <div className="stock-item">
                        <span className="stock-label">Disponible:</span>
                        <span className="stock-value">{product.quantity}</span>
                      </div>
                      <div className="stock-item">
                        <span className="stock-label">Initial:</span>
                        <span className="stock-value">{product.initial_quantity ?? product.quantity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Informations financières */}
                  <div className="financial-section">
                    <div className="price-row">
                      <div className="price-item">
                        <span className="price-label">Achat</span>
                        <span className="price-value purchase">{formatFCFA(product.purchase_price)}</span>
                      </div>
                      <div className="price-item">
                        <span className="price-label">Revente</span>
                        <span className="price-value selling">{formatFCFA(product.selling_price)}</span>
                      </div>
                    </div>
                    
                    <div className="margin-section">
                      <div className="margin-item">
                        <span className="margin-label">Marge unitaire:</span>
                        <span className={`margin-value ${((product.selling_price - product.purchase_price) / product.purchase_price * 100) >= 50 ? 'good' : 'low'}`}>
                          {formatFCFA(product.selling_price - product.purchase_price)}
                        </span>
                      </div>
                      <div className="margin-item">
                        <span className="margin-label">Pourcentage:</span>
                        <span className={`margin-percentage ${((product.selling_price - product.purchase_price) / product.purchase_price * 100) >= 50 ? 'good' : 'low'}`}>
                          {Math.round(((product.selling_price - product.purchase_price) / product.purchase_price) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="total-value">
                      <span className="total-label">Valeur totale:</span>
                      <span className="total-amount">{formatFCFA(product.quantity * product.selling_price)}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {product.description && (
                    <div className="product-description-section">
                      <p className="product-description">{product.description}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="product-actions-enhanced">
                    <button
                      onClick={() => handleEdit(product)}
                      className="action-btn btn-edit"
                      title="Modifier le produit"
                    >
                      <Edit2 size={16} />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="action-btn btn-delete"
                      title="Supprimer le produit"
                    >
                      <Trash2 size={16} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && products.length === 0 && (
          <div className="empty-state">
            <p>Aucun produit enregistré</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={20} />
              Ajouter votre premier produit
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
