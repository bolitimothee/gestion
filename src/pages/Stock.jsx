/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockService } from '../services/stockService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { formatCurrency, getStockStatus, getStockColor } from '../services/formatService';
import './Stock.css';

export default function Stock() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [_searchTerm, setSearchTerm] = useState('');
  const [_selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 0,
    purchase_price: 0,
    selling_price: 0,
    category: '',
    sku: '',
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await stockService.getProducts(user.id);
    if (error) {
      console.error('Erreur stockService:', error);
      setError('Erreur lors du chargement des produits. Vérifiez que la table "products" existe dans Supabase.');
      setProducts([]);
      setFilteredProducts([]);
    } else if (data) {
      setProducts(data || []);
      setFilteredProducts(data || []);
    } else {
      setProducts([]);
      setFilteredProducts([]);
    }
    setLoading(false);
  }, [user]);

  // Get unique categories for filter
  const getCategories = useCallback(() => {
    const categories = [...new Set(products.map(product => product.category).filter(Boolean))];
    return categories.map(category => ({ value: category, label: category }));
  }, [products]);

  // Handle search and filter
  const handleSearch = useCallback((search, category) => {
    setSearchTerm(search);
    setSelectedCategory(category);
    
    let filtered = products;
    
    // Filter by search term
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by category
    if (category) {
      filtered = filtered.filter(product => product.category === category);
    }
    
    setFilteredProducts(filtered);
  }, [products]);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user, loadProducts]);

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
    });
    setEditingId(null);
    setShowForm(false);
  }

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/stock" />
        <main className="main-content">
          <div className="page-header">
            <div className="page-header-content">
              <h1>Gestion des Stocks</h1>
              <SearchBar
                placeholder="Rechercher un produit par nom, SKU, catégorie..."
                onSearch={handleSearch}
                filters={getCategories()}
                showFilters={true}
                className="stock-search-bar"
              />
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              <Plus size={20} />
              Ajouter un produit
            </button>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {showForm && (
            <div className="form-card">
              <h2>{editingId ? 'Modifier le produit' : 'Ajouter un nouveau produit'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="product-name">Nom du Produit *</label>
                    <input
                      id="product-name"
                      type="text"
                      placeholder="Ex: T-Shirt Blanc XL"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                    <span className="form-hint">Entrez le nom ou la description du produit</span>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="category">Catégorie *</label>
                    <input
                      id="category"
                      type="text"
                      placeholder="Ex: Vêtements, Électronique, Alimentation"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    />
                    <span className="form-hint">Catégorie pour organiser les produits</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="purchase-price">Prix d'Achat  *</label>
                    <input
                      id="purchase-price"
                      type="number"
                      placeholder="Ex: 1500"
                      value={formData.purchase_price || ''}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setFormData({ ...formData, purchase_price: 0 });
                          return;
                        }
                        const value = Number(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          setFormData({ ...formData, purchase_price: Math.round(value) });
                        }
                      }}
                      step="1"
                      min="0"
                      required
                    />
                    <span className="form-hint">Coût d'acquisition de chaque unité (nombre entier)</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="selling-price">Prix de Revente  *</label>
                    <input
                      id="selling-price"
                      type="number"
                      placeholder="Ex: 1500"
                      value={formData.selling_price || ''}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setFormData({ ...formData, selling_price: 0 });
                          return;
                        }
                        const value = Number(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          setFormData({ ...formData, selling_price: Math.round(value) });
                        }
                      }}
                      step="1"
                      min="0"
                      required
                    />
                    <span className="form-hint">Prix de vente à vos clients (nombre entier)</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="quantity">Quantité en Stock *</label>
                    <input
                      id="quantity"
                      type="number"
                      placeholder="Ex: 50"
                      value={formData.quantity || ''}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setFormData({ ...formData, quantity: 0 });
                          return;
                        }
                        const value = Number(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          setFormData({ ...formData, quantity: Math.round(value) });
                        }
                      }}
                      min="0"
                      required
                    />
                    <span className="form-hint">Nombre d'unités disponibles</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="sku">Code SKU (optionnel)</label>
                    <input
                      id="sku"
                      type="text"
                      placeholder="Ex: SKU-2024-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                    <span className="form-hint">Code unique pour identifier le produit</span>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description">Description (optionnel)</label>
                  <textarea
                    id="description"
                    placeholder="Entrez les détails du produit..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                  />
                  <span className="form-hint">Informations supplémentaires sur le produit</span>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    {editingId ? 'Mettre à jour' : 'Ajouter le produit'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="loading">Chargement des produits...</div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.quantity, 100);
                return (
                <div key={product.id} className="product-card">
                  <div className="product-header">
                    <h3>{product.name}</h3>
                    <span className="stock-badge" style={{ backgroundColor: getStockColor(product.quantity), color: 'white' }}>
                      {Math.round(Number(product.quantity))}
                    </span>
                  </div>
                  
                  {/* Jauge de niveau de stock */}
                  <div className="stock-gauge-container">
                    <div className="stock-gauge-label">Quantité en stock</div>
                    <div className="stock-gauge">
                      <div 
                        className="stock-gauge-fill" 
                        style={{ 
                          width: `${stockStatus.level}%`,
                          backgroundColor: stockStatus.color 
                        }}
                      ></div>
                    </div>
                    <div className="stock-gauge-info">
                      <span className="stock-quantity">{Math.round(Number(product.quantity))} unités</span>
                      <span className="stock-status" style={{ color: stockStatus.color }}>
                        {stockStatus.label}
                      </span>
                    </div>
                  </div>
                  <p className="product-sku">SKU: {product.sku}</p>
                  <p className="product-category">Catégorie: {product.category}</p>
                  <div className="product-price">
                    <span className="label">Prix d'achat:</span>
                    <span className="price">{formatCurrency(product.purchase_price)}</span>
                  </div>
                  <div className="product-price">
                    <span className="label">Prix de revente:</span>
                    <span className="price">{formatCurrency(product.selling_price)}</span>
                  </div>
                  <div className="product-margin">
                    <span className="label">Marge:</span>
                    <span className="margin">
                      {formatCurrency(product.selling_price - product.purchase_price)} (
                        {product.purchase_price > 0 
                          ? Math.round(((product.selling_price - product.purchase_price) / product.purchase_price) * 100) 
                          : 0
                        }%)
                    </span>
                  </div>
                  <div className="product-total">
                    <span className="label">Total:</span>
                    <span className="total">{formatCurrency(product.quantity * product.selling_price)}</span>
                  </div>
                  <p className="product-description">{product.description}</p>
                  <div className="product-actions">
                    <button
                      onClick={() => handleEdit(product)}
                      className="btn btn-sm btn-edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="btn btn-sm btn-delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="empty-state">
              {products.length === 0 ? (
                <p>Aucun produit enregistré</p>
              ) : (
                <div>
                  <p>Aucun produit trouvé pour votre recherche</p>
                  <button 
                    onClick={() => handleSearch('', '')}
                    className="btn btn-secondary"
                  >
                    Effacer la recherche
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
