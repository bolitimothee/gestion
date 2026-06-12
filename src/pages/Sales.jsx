/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { salesService } from '../services/salesService';
import { stockService } from '../services/stockService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import { Plus, Edit2, Trash2, AlertCircle, Download, Mail, Share2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../services/formatService';
import './Sales.css';

export default function Sales() {
  const { user, account } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
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
    const [salesRes, productsRes] = await Promise.all([
      salesService.getSales(user.id),
      stockService.getProducts(user.id),
    ]);

    if (salesRes.data) {
      setSales(salesRes.data);
      setFilteredSales(salesRes.data);
    }
    if (productsRes.data) setProducts(productsRes.data);
    setLoading(false);
  }, [user]);

  // Get date filter options
  const getDateFilters = useCallback(() => {
    const filters = [
      { value: 'today', label: "Aujourd'hui" },
      { value: 'week', label: 'Cette semaine' },
      { value: 'month', label: 'Ce mois' },
      { value: 'year', label: 'Cette année' },
    ];
    return filters;
  }, []);

  // Handle search and filter
  const handleSearch = useCallback((search, dateFilter) => {
    let filtered = sales;
    
    // Filter by search term
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(sale => {
        const product = products.find(p => p.id === sale.product_id);
        return (
          sale.customer_name.toLowerCase().includes(searchLower) ||
          (product?.name && product.name.toLowerCase().includes(searchLower)) ||
          sale.notes?.toLowerCase().includes(searchLower) ||
          formatDate(sale.sale_date).includes(search)
        );
      });
    }
    
    // Filter by date
    if (dateFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.sale_date);
        saleDate.setHours(0, 0, 0, 0);
        
        switch (dateFilter) {
          case 'today':
            return saleDate.getTime() === today.getTime();
          case 'week': {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return saleDate >= weekStart;
          }
          case 'month':
            return saleDate.getMonth() === today.getMonth() && 
                   saleDate.getFullYear() === today.getFullYear();
          case 'year':
            return saleDate.getFullYear() === today.getFullYear();
          default:
            return true;
        }
      });
    }
    
    setFilteredSales(filtered);
  }, [sales, products]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!formData.product_id || formData.product_id === '') {
      setError('Veuillez sélectionner un produit');
      return;
    }
    
    if (products.length === 0) {
      setError('Aucun produit disponible. Veuillez d\'abord ajouter des produits en stock.');
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
      const product = products.find((p) => p.id === formData.product_id);
      
      if (!product) {
        setError('Produit non trouvé. Veuillez sélectionner un produit valide.');
        return;
      }

      // Vérifier si le stock est suffisant
      if (Number(formData.quantity) > product.quantity) {
        setError(`Stock insuffisant! Seulement ${product.quantity} unités disponibles pour ce produit.`);
        return;
      }

      const saleData = {
        ...formData,
        unit_price: product.selling_price,
        quantity: Number(formData.quantity),
      };

      let result;
      if (editingId) {
        result = await salesService.updateSale(editingId, saleData);
      } else {
        result = await salesService.addSale(user.id, saleData);
      }

      if (result.error) {
        console.error('Erreur service ventes:', result.error);
        setError(result.error.message || 'Erreur lors de l\'ajout de la vente');
        return;
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
    } catch (error) {
      console.error('Erreur handleSubmit ventes:', error);
      setError(error.message || 'Erreur lors de l\'ajout de la vente');
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
      await salesService.deleteSale(id);
      await loadData();
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
    text += `Entreprise: ${account?.account_name || 'Commerce'}\n`;
    text += `Date d'export: ${new Date().toLocaleString('fr-FR')}\n`;
    text += `${'='.repeat(80)}\n\n`;

    filteredSales.forEach((sale) => {
      const product = products.find(p => p.id === sale.product_id);
      text += `Date: ${formatDate(sale.sale_date)}\n`;
      text += `Client: ${sale.customer_name}\n`;
      text += `Produit: ${product?.name || 'Produit supprimé'}\n`;
      text += `Quantité: ${sale.quantity}\n`;
      text += `Montant: ${formatCurrency(sale.total_amount || (sale.quantity * sale.unit_price))}\n`;
      text += `Notes: ${sale.notes || 'Aucune'}\n`;
      text += `${'-'.repeat(80)}\n\n`;
    });

    text += `${'='.repeat(80)}\n`;
    text += `Total ventes: ${filteredSales.length}\n`;
    text += `Montant total: ${formatCurrency(filteredSales.reduce((sum, s) => sum + (s.total_amount || (s.quantity * s.unit_price)), 0))}\n`;

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
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/sales" />
        <main className="main-content">
          <div className="page-header">
            <div className="page-header-content">
              <h1>Gestion des Ventes</h1>
              <SearchBar
                placeholder="Rechercher une vente par client, produit, date..."
                onSearch={handleSearch}
                filters={getDateFilters()}
                showFilters={true}
                className="sales-search-bar"
              />
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              <Plus size={20} />
              Ajouter une vente
            </button>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading">Chargement des ventes...</div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <h3>Aucun produit disponible</h3>
              <p>Vous devez d'abord ajouter des produits en stock avant de pouvoir enregistrer des ventes.</p>
              <button 
                onClick={() => navigate('/stock')}
                className="btn btn-primary"
              >
                Aller à la gestion des stocks
              </button>
            </div>
          ) : (
            <div className="sales-layout">
              {showForm && (
                <div className="sales-form-section">
                  <div className="form-card">
                    <h2>{editingId ? 'Modifier la vente' : 'Nouvelle Vente'}</h2>
                    <form onSubmit={handleSubmit}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="product">Produit *</label>
                          <select
                            id="product"
                            value={formData.product_id}
                            onChange={(e) => {
                              const product = products.find(p => String(p.id) === String(e.target.value));
                              setFormData({
                                ...formData,
                                product_id: e.target.value,
                                unit_price: product?.selling_price || 0,
                                quantity: 1,
                              });
                            }}
                            required
                          >
                            <option value="">Sélectionner un produit</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {formatCurrency(product.selling_price)}
                              </option>
                            ))}
                          </select>
                          <span className="form-hint">Choisissez le produit vendu</span>
                        </div>

                        <div className="form-group">
                          <label htmlFor="quantity">Quantité *</label>
                          <input
                            id="quantity"
                            type="number"
                            placeholder="Ex: 2"
                            value={formData.quantity === '' ? '' : formData.quantity}
                            onChange={(e) => {
                              const selectedProduct = products.find(p => String(p.id) === String(formData.product_id));
                              const maxQuantity = selectedProduct ? selectedProduct.quantity : 1;
                              if (e.target.value === '') {
                                setFormData({ ...formData, quantity: '' });
                                return;
                              }
                              const newQuantity = Number(e.target.value);
                              if (isNaN(newQuantity) || newQuantity < 1) {
                                return;
                              }
                              setFormData({ ...formData, quantity: Math.min(newQuantity, maxQuantity) });
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || e.target.value === null) {
                                setFormData({ ...formData, quantity: 1 });
                              }
                            }}
                            min="1"
                            max={products.find(p => String(p.id) === String(formData.product_id))?.quantity || 1}
                            required
                          />
                          <span className="form-hint">
                            Stock disponible: {products.find(p => String(p.id) === String(formData.product_id))?.quantity || 0} unités
                          </span>
                        </div>

                        <div className="form-group">
                          <label htmlFor="customer">Nom du client *</label>
                          <input
                            id="customer"
                            type="text"
                            placeholder="Ex: Jean Dupont"
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            required
                          />
                          <span className="form-hint">Nom ou identifier du client</span>
                        </div>

                        <div className="form-group">
                          <label htmlFor="saleDate">Date de vente *</label>
                          <input
                            id="saleDate"
                            type="date"
                            value={formData.sale_date}
                            onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                            required
                          />
                          <span className="form-hint">Quand la vente s'est effectuée</span>
                        </div>

                        <div className="form-group">
                          <label htmlFor="saleTime">Heure de vente</label>
                          <input
                            id="saleTime"
                            type="time"
                            value={formData.sale_time}
                            onChange={(e) => setFormData({ ...formData, sale_time: e.target.value })}
                          />
                          <span className="form-hint">À quelle heure la vente s'est effectuée</span>
                        </div>
                      </div>

                      <div className="form-group full-width">
                        <label htmlFor="notes">Notes (optionnel)</label>
                        <textarea
                          id="notes"
                          placeholder="Remarques ou détails supplémentaires..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows="3"
                        />
                        <span className="form-hint">Informations supplémentaires sur la vente</span>
                      </div>

                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                          {editingId ? 'Mettre à jour' : 'Enregistrer la vente'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForm(false);
                            setEditingId(null);
                            setFormData({
                              product_id: '',
                              quantity: 1,
                              unit_price: 0,
                              customer_name: '',
                              sale_date: new Date().toISOString().split('T')[0],
                              sale_time: new Date().toTimeString().slice(0, 5),
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
                </div>
              )}

              <div className="sales-history-section">
                <div className="sales-container">
                  {sales.length > 0 && (
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

                  <div className="sales-table">
                    {filteredSales.length > 0 ? (
                      <div className="table-responsive">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Heure</th>
                              <th>Client</th>
                              <th>Produit</th>
                              <th>Quantité</th>
                              <th>Montant</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSales.map((sale) => {
                              const product = products.find(p => p.id === sale.product_id);
                              return (
                                <tr key={sale.id}>
                                  <td data-label="Date">{formatDate(sale.sale_date)}</td>
                                  <td data-label="Heure">{sale.sale_time || '--'}</td>
                                  <td data-label="Client">{sale.customer_name}</td>
                                  <td data-label="Produit">{product?.name || 'Produit supprimé'}</td>
                                  <td data-label="Quantité" className="quantity">{sale.quantity}</td>
                                  <td data-label="Montant" className="amount">{formatCurrency(sale.total_amount || (sale.quantity * sale.unit_price))}</td>
                                  <td className="actions-cell" data-label="Actions">
                                    <button
                                      onClick={() => handleEdit(sale)}
                                      className="btn btn-sm btn-edit"
                                      title="Modifier"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(sale.id)}
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
                      <p className="empty-message">Aucune vente enregistrée</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
