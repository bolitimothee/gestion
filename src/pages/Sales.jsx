import React, { useState, useEffect, useCallback, useRef } from 'react';
import logger from '../utils/logger';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createSaleRequestId, salesService } from '../services/salesService';
import { stockService } from '../services/stockService';
import { customerService } from '../services/customerService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import ExportMenu from '../components/ExportMenu';
import { Plus, Edit2, Trash2, AlertCircle, FileText } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../services/formatService';
import { showToast } from '../utils/toastService';
import NoteViewer from '../components/NoteViewer';
import './Sales.css';

export default function Sales() {
  const { user, account } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [noteToRead, setNoteToRead] = useState('');
  const formRef = useRef(null);
  const saleRequestRef = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, saleId: null, customerName: '' });
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    customer_name: '',
    sale_date: new Date().toISOString().split('T')[0],
    sale_time: new Date().toTimeString().slice(0, 5),
    payment_method: 'cash',
    paid_amount: 0,
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [salesRes, productsRes, customersRes] = await Promise.allSettled([
        salesService.getSales(user.id),
        stockService.getProducts(user.id),
        customerService.getCustomers(user.id),
      ]);

      const salesResult = salesRes.status === 'fulfilled' ? salesRes.value : null;
      const productsResult = productsRes.status === 'fulfilled' ? productsRes.value : null;
      const customersResult = customersRes.status === 'fulfilled' ? customersRes.value : null;

      if (salesResult?.data) {
        setSales(salesResult.data);
        setFilteredSales(salesResult.data);
      } else if (salesResult?.error) {
        logger.error('Erreur salesService.getSales:', salesResult.error);
        setError(salesResult.error.message || 'Erreur lors du chargement des ventes.');
      }

      if (productsResult?.data) {
        setProducts(productsResult.data);
      } else if (productsResult?.error) {
        logger.error('Erreur stockService.getProducts:', productsResult.error);
      }

      if (customersResult?.data) {
        setClients(customersResult.data);
      } else if (customersResult?.error) {
        logger.warn('Erreur customerService.getCustomers:', customersResult.error);
      }

      if (!salesResult?.data && !productsResult?.data) {
        setSales([]);
        setFilteredSales([]);
        setProducts([]);
      }
    } catch (error) {
      logger.error('Erreur chargement données Ventes:', error);
      setError(error.message || 'Erreur lors du chargement des données de vente.');
      setSales([]);
      setFilteredSales([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
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

  const getSaleProductLabel = useCallback((sale) => {
    const itemNames = [...new Set((sale.sale_items || []).map((item) => item.product_name).filter(Boolean))];
    if (itemNames.length) return itemNames.join(', ');
    return products.find((product) => String(product.id) === String(sale.product_id))?.name || 'Produit supprimé';
  }, [products]);

  // Handle search and filter
  const handleSearch = useCallback((search, dateFilter) => {
    let filtered = sales;
    
    // Filter by search term
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(sale => {
        return (
          sale.customer_name?.toLowerCase().includes(searchLower) ||
          getSaleProductLabel(sale).toLowerCase().includes(searchLower) ||
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
  }, [sales, getSaleProductLabel]);

  useEffect(() => {
    if (!user) return undefined;

    (async () => {
      try {
        await loadData();
      } catch (e) {
        logger.error('Erreur chargement données Ventes:', e);
      }
    })();

    return undefined;
  }, [user, loadData]);

  useEffect(() => {
    if (showForm && editingId !== null) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm, editingId]);

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
    const selectedClient = clients.find((client) => client.name === formData.customer_name);
    if (formData.payment_method === 'credit' && !selectedClient) {
      setError('Le crédit nécessite un client enregistré. Sélectionnez un client existant.');
      return;
    }
    if (formData.quantity <= 0) {
      setError('La quantité doit être supérieure à 0');
      return;
    }

    try {
      const product = products.find((p) => String(p.id) === String(formData.product_id));
      
      if (!product) {
        setError('Produit non trouvé. Veuillez sélectionner un produit valide.');
        return;
      }

      // Vérifier si le stock est suffisant
      if (Number(formData.quantity) > product.quantity) {
        setError(`Stock insuffisant! Seulement ${product.quantity} unités disponibles pour ce produit.`);
        return;
      }

      const totalAmount = Number(formData.quantity) * Number(product.selling_price);
      const paidAmount = formData.payment_method === 'credit' ? 0 : Number(formData.paid_amount || totalAmount);
      const saleData = {
        ...formData,
        product_id: Number(formData.product_id),
        product_name: product.name,
        unit_price: product.selling_price,
        quantity: Number(formData.quantity),
        client_id: selectedClient?.id || null,
        paid_amount: paidAmount,
        total_amount: totalAmount,
      };

      let result;
      if (editingId) {
        result = await salesService.updateSale(user.id, editingId, saleData);
      } else {
        const requestFingerprint = JSON.stringify({
          userId: user.id,
          items: [{
            product_id: saleData.product_id,
            product_name: saleData.product_name,
            quantity: saleData.quantity,
            unit_price: saleData.unit_price,
            unit_cost: Number(saleData.unit_cost || 0),
            discount: Number(saleData.discount || 0),
            subtotal: saleData.total_amount,
          }],
          client_id: saleData.client_id,
          client_name: saleData.customer_name,
          client_phone: saleData.client_phone || null,
          payment_method: saleData.payment_method || 'cash',
          total_amount: saleData.total_amount,
          paid_amount: saleData.paid_amount,
          total_discount: Number(saleData.total_discount || saleData.discount || 0),
          notes: saleData.notes || null,
        });
        if (saleRequestRef.current?.fingerprint !== requestFingerprint) {
          saleRequestRef.current = {
            fingerprint: requestFingerprint,
            requestId: createSaleRequestId(),
          };
        }
        result = await salesService.createSale(user.id, {
          ...saleData,
          request_id: saleRequestRef.current.requestId,
        });
      }

      if (result.error) {
        logger.error('Erreur service ventes:', result.error);
        setError(result.error.message || 'Erreur lors de l\'ajout de la vente');
        return;
      }

      showToast(
        result.queued
          ? 'Vente enregistrée hors ligne, synchronisation en attente'
          : (editingId ? 'Vente mise à jour avec succès' : 'Vente enregistrée avec succès'),
        'success'
      );

      setFormData({
        product_id: '',
        quantity: 1,
        unit_price: 0,
        customer_name: '',
        sale_date: new Date().toISOString().split('T')[0],
        sale_time: new Date().toTimeString().slice(0, 5),
        payment_method: 'cash',
        paid_amount: 0,
        notes: '',
      });
      saleRequestRef.current = null;
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (error) {
      logger.error('Erreur handleSubmit ventes:', error);
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
      sale_time: formatTime(sale.sale_time),
      payment_method: sale.payment_method || 'cash',
      paid_amount: sale.paid_amount ?? sale.total_amount ?? 0,
      notes: sale.notes,
    });
    setEditingId(sale.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    const sale = sales.find(s => s.id === id);
    setDeleteConfirm({ show: true, saleId: id, customerName: sale?.customer_name || '' });
  }

  async function confirmDelete() {
    if (deleteConfirm.saleId) {
      const deletedSaleId = deleteConfirm.saleId;
      const result = await salesService.deleteSale(deletedSaleId);
      if (result.error) {
        logger.error('Erreur suppression vente:', result.error);
        showToast(result.error.message || 'Impossible de supprimer cette vente.', 'error');
        return;
      }

      setSales((currentSales) => currentSales.filter((sale) => sale.id !== deletedSaleId));
      setFilteredSales((currentSales) => currentSales.filter((sale) => sale.id !== deletedSaleId));
      showToast('Vente supprimée avec succès', 'success');
      setDeleteConfirm({ show: false, saleId: null, customerName: '' });
      await loadData();
    }
  }

  function cancelDelete() {
    setDeleteConfirm({ show: false, saleId: null, customerName: '' });
  }

  const exportRows = filteredSales.map((sale) => {
    return {
      sale_date: formatDate(sale.sale_date),
      sale_time: formatTime(sale.sale_time) || '--',
      customer_name: sale.customer_name || 'Client de passage',
      product_name: getSaleProductLabel(sale),
      quantity: sale.quantity,
      total_amount: sale.total_amount || (sale.quantity * sale.unit_price),
    };
  });

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/sales" />
        <main className="main-content sales-page">
          <div className="page-header sales-page-header">
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
            <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-add">
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
            <>
              {showForm && (
                <div className="sales-form-section" ref={formRef}>
                  <div className="form-card app-form-card">
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
                            list="customer-suggestions"
                            required
                          />
                          <datalist id="customer-suggestions">
                            {clients.map((client) => (
                              <option key={client.id} value={client.name} />
                            ))}
                          </datalist>
                          <span className="form-hint">Nom ou identifiant du client.</span>
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
                          <span className="form-hint">Date à laquelle la vente a eu lieu.</span>
                        </div>

                        <div className="form-group">
                          <label htmlFor="saleTime">Heure de vente</label>
                          <input
                            id="saleTime"
                            type="time"
                            value={formData.sale_time}
                            onChange={(e) => setFormData({ ...formData, sale_time: e.target.value })}
                          />
                          <span className="form-hint">Heure à laquelle la vente a eu lieu.</span>
                        </div>

                        <div className="form-group">
                          <label htmlFor="paymentMethod">Mode de paiement *</label>
                          <select
                            id="paymentMethod"
                            value={formData.payment_method}
                            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value, paid_amount: e.target.value === 'credit' ? 0 : formData.paid_amount })}
                            required
                          >
                            <option value="cash">Espèces</option>
                            <option value="mobile_money">Mobile Money</option>
                            <option value="card">Carte</option>
                            <option value="credit">Crédit</option>
                          </select>
                          <span className="form-hint">Choisissez comment le client règle la vente.</span>
                        </div>

                        <div className="form-group">
                          <label htmlFor="paidAmount">Montant payé *</label>
                          <input
                            id="paidAmount"
                            type="number"
                            min="0"
                            value={formData.payment_method === 'credit' ? 0 : formData.paid_amount}
                            disabled={formData.payment_method === 'credit'}
                            onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
                            required
                          />
                          <span className="form-hint">Le montant restant sera enregistré comme créance.</span>
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
                              payment_method: 'cash',
                              paid_amount: 0,
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

              <div className="sales-layout">
                <div className="sales-history-section">
                  <div className="sales-container">
                    {sales.length > 0 && (
                      <div className="export-actions">
                        <ExportMenu
                          data={exportRows}
                          columns={[
                            { key: 'sale_date', label: 'Date' },
                            { key: 'sale_time', label: 'Heure' },
                            { key: 'customer_name', label: 'Client' },
                            { key: 'product_name', label: 'Produit' },
                            { key: 'quantity', label: 'Quantité' },
                            { key: 'total_amount', label: 'Montant' },
                          ]}
                          filename="historique_ventes"
                          title="Historique des ventes"
                          whatsappPhone=""
                          email=""
                          accountName={account?.account_name || 'Commerce'}
                        />
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
                                return (
                                  <tr key={sale.id}>
                                    <td data-label="Date">{formatDate(sale.sale_date)}</td>
                                    <td data-label="Heure">{formatTime(sale.sale_time) || '--'}</td>
                                    <td data-label="Client">{sale.customer_name}</td>
                                    <td data-label="Produit">{getSaleProductLabel(sale)}</td>
                                    <td data-label="Quantité" className="quantity">{sale.quantity}</td>
                                    <td data-label="Montant" className="amount">{formatCurrency(sale.total_amount || (sale.quantity * sale.unit_price))}</td>
                                    <td className="actions-cell" data-label="Actions">
                                      <button
                                        onClick={() => handleEdit(sale)}
                                        className="btn btn-sm btn-edit"
                                        title={sale.sale_items?.length > 1 ? 'Modification indisponible pour les ventes multi-produits' : 'Modifier'}
                                        disabled={sale.sale_items?.length > 1}
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
                                      {sale.notes?.trim() && (
                                        <button
                                          type="button"
                                          onClick={() => setNoteToRead(sale.notes)}
                                          className="btn btn-sm btn-secondary"
                                          title="Lire les notes"
                                          aria-label="Lire les notes de la vente"
                                        >
                                          <FileText size={16} />
                                        </button>
                                      )}
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
            </>
          )}

          {deleteConfirm.show && (
            <div className="modal-overlay" onClick={cancelDelete}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Confirmer la suppression</h3>
                <p>Êtes-vous sûr de vouloir supprimer la vente de "{deleteConfirm.customerName}" ?</p>
                <p className="modal-warning">Cette action est irréversible et le stock sera remis à jour.</p>
                <div className="modal-actions">
                  <button onClick={confirmDelete} className="btn btn-danger">Supprimer</button>
                  <button onClick={cancelDelete} className="btn btn-secondary">Annuler</button>
                </div>
              </div>
            </div>
          )}
          <NoteViewer
            title="Notes de la vente"
            note={noteToRead}
            onClose={() => setNoteToRead('')}
          />
        </main>
      </div>
    </div>
  );
}
