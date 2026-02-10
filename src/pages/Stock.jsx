/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockService } from '../services/stockService';
import { useProductsSync } from '../hooks/useRealtimeSync';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import './Stock.css';

const formatFCFA = (amount) => {
  if (!isFinite(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
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

  // Synchroniser les produits en temps réel
  useProductsSync(user?.id, setProducts);

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
            <h1>Gestion des Stocks</h1>
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
                      placeholder="Ex: 15.50"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                      step="0.01"
                      min="0"
                      required
                    />
                    <span className="form-hint">Coût d'acquisition de chaque unité</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="selling-price">Prix de Revente  *</label>
                    <input
                      id="selling-price"
                      type="number"
                      placeholder="Ex: 24.99"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                      step="0.01"
                      min="0"
                      required
                    />
                    <span className="form-hint">Prix de vente à vos clients</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="quantity">Quantité en Stock *</label>
                    <input
                      id="quantity"
                      type="number"
                      placeholder="Ex: 50"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
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
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-header">
                    <h3>{product.name}</h3>
                    <span className={`stock-badge ${product.quantity > 10 ? 'in-stock' : 'low-stock'}`}>
                      {product.quantity}
                    </span>
                  </div>
                  <p className="product-sku">SKU: {product.sku}</p>
                  <p className="product-category">Catégorie: {product.category}</p>
                  <div className="product-price">
                    <span className="label">Prix d'achat:</span>
                    <span className="price">{formatFCFA(product.purchase_price)}</span>
                  </div>
                  <div className="product-price">
                    <span className="label">Prix de revente:</span>
                    <span className="price">{formatFCFA(product.selling_price)}</span>
                  </div>
                  <div className="product-margin">
                    <span className="label">Marge:</span>
                    <span className="margin">{formatFCFA(product.selling_price - product.purchase_price)} ({Math.round(((product.selling_price - product.purchase_price) / product.purchase_price) * 100)}%)</span>
                  </div>
                  <div className="product-total">
                    <span className="label">Total:</span>
                    <span className="total">{formatFCFA(product.quantity * product.selling_price)}</span>
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
              ))}
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="empty-state">
              <p>Aucun produit enregistré</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
