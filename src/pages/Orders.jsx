import React, { useCallback, useEffect, useState } from 'react';
import logger from '../utils/logger';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { stockService } from '../services/stockService';
import { customerService } from '../services/customerService';
import { formatCurrency, formatDate } from '../services/formatService';
import { showToast } from '../utils/toastService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import { Plus, X, FileText } from 'lucide-react';
import NoteViewer from '../components/NoteViewer';
import './Orders.css';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteToRead, setNoteToRead] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [orderForm, setOrderForm] = useState({ client_name: '', client_phone: '', order_date: new Date().toISOString().split('T')[0], notes: '' });
  const [orderItems, setOrderItems] = useState([]);
  const [deliveryOrderId, setDeliveryOrderId] = useState(null);
  const [deliveryPayment, setDeliveryPayment] = useState({ payment_method: 'cash', paid_amount: 0 });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await orderService.getOrders(user.id);
      if (result.error) {
        logger.error('Erreur chargement commandes:', result.error);
        setError('La table des commandes n’est pas disponible. Exécutez la migration Supabase additive pour activer cette page.');
        setOrders([]);
        setFilteredOrders([]);
      } else {
        setError('');
        setOrders(result.data || []);
        setFilteredOrders(result.data || []);
      }
    } catch (error) {
      logger.error('Erreur inattendue chargement commandes:', error);
      setError(error.message || 'Impossible de charger les commandes.');
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    (async () => {
      await loadOrders();
    })();
    return undefined;
  }, [user, loadOrders]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    Promise.allSettled([stockService.getProducts(user.id), customerService.getCustomers(user.id)])
      .then(([productsResult, clientsResult]) => {
        if (!active) return;
        if (productsResult.status === 'fulfilled') {
          setProducts(productsResult.value.data || []);
          if (productsResult.value.error) logger.error('Erreur chargement produits de commande:', productsResult.value.error);
        } else {
          logger.error('Erreur inattendue chargement produits de commande:', productsResult.reason);
        }
        if (clientsResult.status === 'fulfilled') {
          setClients(clientsResult.value.data || []);
          if (clientsResult.value.error) logger.error('Erreur chargement clients de commande:', clientsResult.value.error);
        } else {
          logger.error('Erreur inattendue chargement clients de commande:', clientsResult.reason);
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleSearch = useCallback((search, status) => {
    const value = search.trim().toLowerCase();
    setFilteredOrders(orders.filter((order) => {
      const matchesSearch = !value || [order.reference, order.client_name, order.client_phone]
        .some((field) => field?.toLowerCase().includes(value));
      return matchesSearch && (!status || order.status === status);
    }));
  }, [orders]);

  async function changeStatus(orderId, status) {
    if (status === 'delivered') {
      const order = orders.find((item) => item.id === orderId);
      setDeliveryOrderId(orderId);
      setDeliveryPayment({ payment_method: 'cash', paid_amount: order?.total_amount || 0 });
      return;
    }
    const result = await orderService.updateStatus(orderId, status);
    if (result.error) {
      setError(result.error.message || 'Impossible de mettre à jour la commande.');
      return;
    }
    showToast('Statut de la commande mis à jour', 'success');
    await loadOrders();
  }

  async function deliverOrder() {
    const result = await orderService.deliverOrder(user.id, deliveryOrderId, deliveryPayment);
    if (result.error) {
      setError(result.error.message || 'Impossible de livrer la commande.');
      return;
    }
    setDeliveryOrderId(null);
    showToast('Commande livrée et vente enregistrée', 'success');
    await loadOrders();
  }

  function addItem() {
    const product = products[0];
    if (!product) return;
    setOrderItems([...orderItems, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: Number(product.selling_price), subtotal: Number(product.selling_price) }]);
  }

  function updateItem(index, key, value) {
    const nextItems = [...orderItems];
    if (key === 'product_id') {
      const product = products.find((item) => String(item.id) === String(value));
      nextItems[index] = { ...nextItems[index], product_id: product.id, product_name: product.name, unit_price: Number(product.selling_price), subtotal: Number(product.selling_price) * nextItems[index].quantity };
    } else {
      nextItems[index] = { ...nextItems[index], [key]: value, subtotal: key === 'quantity' ? Number(value) * nextItems[index].unit_price : nextItems[index].subtotal };
    }
    setOrderItems(nextItems);
  }

  async function createOrder(event) {
    event.preventDefault();
    if (!orderForm.client_name.trim() || !orderItems.length) {
      setError('Un client et au moins un produit sont nécessaires.');
      return;
    }
    const selectedClient = clients.find((client) => client.name === orderForm.client_name);
    const result = await orderService.createOrder(user.id, { ...orderForm, client_id: selectedClient?.id }, orderItems);
    if (result.error) {
      setError(result.error.message || 'Impossible de créer la commande.');
      return;
    }
    showToast('Commande créée avec succès', 'success');
    setShowForm(false);
    setOrderItems([]);
    setOrderForm({ client_name: '', client_phone: '', order_date: new Date().toISOString().split('T')[0], notes: '' });
    await loadOrders();
  }

  const statusLabels = { pending: 'En attente', delivered: 'Livrée', cancelled: 'Annulée' };

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/orders" />
        <main className="main-content">
          <div className="page-header">
            <div className="page-header-content">
              <h1>Commandes</h1>
              <SearchBar
                placeholder="Rechercher une commande ou un client..."
                onSearch={handleSearch}
                filters={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
                showFilters
              />
            </div>
            <button type="button" className="btn btn-add" onClick={() => setShowForm(!showForm)}><Plus size={20} /> Nouvelle commande</button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {deliveryOrderId && (
            <div className="form-card app-form-card delivery-card">
              <h2>Livrer la commande</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="delivery-method">Mode de paiement</label>
                  <select
                    id="delivery-method"
                    value={deliveryPayment.payment_method}
                    onChange={(event) => setDeliveryPayment({
                      ...deliveryPayment,
                      payment_method: event.target.value,
                      paid_amount: event.target.value === 'credit' ? 0 : deliveryPayment.paid_amount,
                    })}
                  >
                    <option value="cash">Espèces</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="card">Carte</option>
                    <option value="credit">Crédit</option>
                  </select>
                  <span className="form-hint">Sélectionnez le moyen de règlement du client.</span>
                </div>
                <div className="form-group">
                  <label htmlFor="delivery-paid">Montant payé</label>
                  <input
                    id="delivery-paid"
                    type="number"
                    min="0"
                    disabled={deliveryPayment.payment_method === 'credit'}
                    value={deliveryPayment.payment_method === 'credit' ? 0 : deliveryPayment.paid_amount}
                    onChange={(event) => setDeliveryPayment({ ...deliveryPayment, paid_amount: Number(event.target.value) })}
                  />
                  <span className="form-hint">Saisissez le montant reçu. Le reste sera enregistré comme créance.</span>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-primary" onClick={deliverOrder}>Confirmer la livraison</button>
                <button type="button" className="btn btn-secondary" onClick={() => setDeliveryOrderId(null)}>Annuler</button>
              </div>
            </div>
          )}
          {showForm && (
            <div className="form-card app-form-card order-form-card">
              <div className="client-form-heading">
                <h2>Nouvelle commande</h2>
                <button type="button" className="btn btn-icon" onClick={() => setShowForm(false)} aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={createOrder}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="order-client">Client *</label>
                    <input
                      id="order-client"
                      list="order-clients"
                      value={orderForm.client_name}
                      onChange={(event) => {
                        const client = clients.find((item) => item.name === event.target.value);
                        setOrderForm({
                          ...orderForm,
                          client_name: event.target.value,
                          client_phone: client?.phone || orderForm.client_phone,
                        });
                      }}
                      required
                    />
                    <datalist id="order-clients">{clients.map((client) => <option key={client.id} value={client.name} />)}</datalist>
                    <span className="form-hint">Choisissez un client existant ou saisissez son nom.</span>
                  </div>
                  <div className="form-group">
                    <label htmlFor="order-phone">Téléphone</label>
                    <input id="order-phone" value={orderForm.client_phone} onChange={(event) => setOrderForm({ ...orderForm, client_phone: event.target.value })} />
                    <span className="form-hint">Numéro à utiliser pour contacter le client au sujet de la commande.</span>
                  </div>
                  <div className="form-group">
                    <label htmlFor="order-date">Date *</label>
                    <input id="order-date" type="date" value={orderForm.order_date} onChange={(event) => setOrderForm({ ...orderForm, order_date: event.target.value })} required />
                    <span className="form-hint">Date à laquelle la commande a été passée.</span>
                  </div>
                </div>
                <div className="order-items-editor">
                  <div className="client-form-heading">
                    <h3>Produits</h3>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                      <Plus size={16} /> Ajouter
                    </button>
                  </div>
                  {orderItems.map((item, index) => (
                    <div className="order-item-row" key={`${item.product_id}-${index}`}>
                      <div className="form-group">
                        <label htmlFor={`order-product-${index}`}>Produit {index + 1} *</label>
                        <select
                          id={`order-product-${index}`}
                          value={item.product_id}
                          onChange={(event) => updateItem(index, 'product_id', event.target.value)}
                        >
                          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                        <span className="form-hint">Choisissez le produit à inclure dans la commande.</span>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`order-quantity-${index}`}>Quantité *</label>
                        <input
                          id={`order-quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) => updateItem(index, 'quantity', Number(event.target.value))}
                        />
                        <span className="form-hint">Nombre d’unités souhaitées.</span>
                      </div>
                      <strong>{formatCurrency(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label htmlFor="order-notes">Notes</label>
                  <textarea id="order-notes" value={orderForm.notes} onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })} rows="2" />
                  <span className="form-hint">Ajoutez des précisions utiles pour préparer ou suivre la commande.</span>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Valider la commande</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                </div>
              </form>
            </div>
          )}
          {loading ? <div className="loading">Chargement des commandes...</div> : filteredOrders.length === 0 ? <div className="empty-state"><h3>Aucune commande</h3><p>Les commandes enregistrées apparaîtront ici.</p></div> : (
            <div className="orders-table table-responsive">
              <table>
                <thead><tr><th>Référence</th><th>Client</th><th>Date</th><th>Livraison</th><th>Total</th><th>Notes</th><th>Statut</th></tr></thead>
                <tbody>{filteredOrders.map((order) => <tr key={order.id}>
                  <td data-label="Référence">{order.reference || `#${order.id}`}</td>
                  <td data-label="Client"><strong>{order.client_name}</strong>{order.client_phone && <small>{order.client_phone}</small>}</td>
                  <td data-label="Date">{formatDate(order.order_date)}</td>
                  <td data-label="Livraison">{order.delivery_date ? formatDate(order.delivery_date) : '--'}</td>
                  <td data-label="Total" className="amount">{formatCurrency(order.total_amount)}</td>
                  <td data-label="Notes">{order.notes?.trim() && <button type="button" className="btn btn-sm btn-secondary" title="Lire les notes" aria-label="Lire les notes de la commande" onClick={() => setNoteToRead(order.notes)}><FileText size={16} /></button>}</td>
                  <td data-label="Statut"><select className={`order-status order-status-${order.status}`} value={order.status} onChange={(event) => changeStatus(order.id, event.target.value)} aria-label={`Statut de ${order.reference || order.id}`} disabled={order.status !== 'pending'}><option value="pending">En attente</option><option value="delivered">Livrée</option><option value="cancelled">Annulée</option></select><span className="order-status-label">{statusLabels[order.status] || order.status}</span></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
          <NoteViewer title="Notes de la commande" note={noteToRead} onClose={() => setNoteToRead('')} />
        </main>
      </div>
    </div>
  );
}
