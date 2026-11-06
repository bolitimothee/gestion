import React, { useCallback, useEffect, useState } from 'react';
import logger from '../utils/logger';
import { useAuth } from '../context/AuthContext';
import { customerService } from '../services/customerService';
import { formatCurrency } from '../services/formatService';
import { showToast } from '../utils/toastService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import StatCard from '../components/StatCard';
import ClientDetailModal from '../components/ClientDetailModal';
import { CircleDollarSign, Edit2, FileText, Plus, Users, X } from 'lucide-react';
import NoteViewer from '../components/NoteViewer';
import './Clients.css';

export default function Clients() {
  const { user, account } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [noteToRead, setNoteToRead] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', company_name: '', address: '', notes: '' });

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await customerService.getCustomers(user.id);
    if (result.error) {
      logger.error('Erreur chargement clients:', result.error);
      setError(result.error.message || 'Impossible de charger les clients.');
      setClients([]);
    } else {
      setClients(result.data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    (async () => {
      await loadClients();
    })();
    return undefined;
  }, [user, loadClients]);

  const handleSearch = useCallback((search, filter) => {
    setSearchQuery(search.trim().toLowerCase());
    setFilterMode(filter || 'all');
  }, []);

  const getClientBalance = (client) => Number(client.balance ?? client.balance_fcfa ?? 0);
  const totalReceivables = clients.reduce((total, client) => total + Math.max(0, getClientBalance(client)), 0);
  const debtorCount = clients.filter((client) => getClientBalance(client) > 0).length;
  const searchValue = searchQuery;
  const filteredClients = [...clients]
    .filter((client) => {
      const matchesSearch = [client.name, client.phone, client.email, client.company_name]
        .some((field) => field?.toLowerCase().includes(searchValue));
      const balance = getClientBalance(client);
      const matchesDebt = filterMode === 'debt' ? balance > 0 : filterMode === 'clear' ? balance <= 0 : true;
      return matchesSearch && matchesDebt;
    })
    .sort((first, second) => getClientBalance(second) - getClientBalance(first));

  function resetForm() {
    setFormData({ name: '', phone: '', email: '', company_name: '', address: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
  }

  function editClient(client) {
    setFormData({
      name: client.name || '', phone: client.phone || '', email: client.email || '',
      company_name: client.company_name || '', address: client.address || '', notes: client.notes || '',
    });
    setEditingId(client.id);
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError('Le nom du client est obligatoire.');
      return;
    }
    const result = editingId
      ? await customerService.updateCustomer(editingId, formData)
      : await customerService.addCustomer(user.id, formData);
    if (result.error) {
      setError(result.error.message || 'Impossible d’enregistrer le client.');
      return;
    }
    showToast(editingId ? 'Client modifié avec succès' : 'Client ajouté avec succès', 'success');
    resetForm();
    await loadClients();
  }

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/clients" />
        <main className="main-content">
          <div className="page-header clients-page-header">
            <div className="page-header-content">
              <h1>Clients</h1>
              <SearchBar
                placeholder="Rechercher un client..."
                onSearch={handleSearch}
                filters={[
                  { value: 'debt', label: 'Avec dette' },
                  { value: 'clear', label: 'Sans dette' },
                ]}
                showFilters
                className="clients-search-bar"
              />
            </div>
            <button type="button" className="btn btn-add" onClick={() => setShowForm(!showForm)}>
              <Plus size={20} /> Ajouter un client
            </button>
          </div>

          <section className="clients-overview" aria-label="Résumé des créances">
            <StatCard title="Total des créances" value={formatCurrency(totalReceivables)} icon={CircleDollarSign} color="orange" />
            <div className="clients-debt-summary"><Users size={20} /><strong>{debtorCount}</strong><span>client{debtorCount === 1 ? '' : 's'} avec dette</span></div>
          </section>

          {error && <div className="alert alert-error">{error}</div>}

          {showForm && (
            <div className="form-card app-form-card client-form-card">
              <div className="client-form-heading"><h2>{editingId ? 'Modifier le client' : 'Nouveau client'}</h2><button type="button" className="btn btn-icon" onClick={resetForm} aria-label="Fermer"><X size={18} /></button></div>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  {[
                    ['name', 'Nom complet *', 'Nom utilisé pour retrouver ce client.'],
                    ['phone', 'Téléphone', 'Numéro à utiliser pour contacter le client.'],
                    ['email', 'E-mail', 'Adresse e-mail, si disponible.'],
                    ['company_name', 'Entreprise', 'Entreprise ou commerce associé, le cas échéant.'],
                    ['address', 'Adresse', 'Adresse de livraison ou de contact, si utile.'],
                    ['notes', 'Notes', 'Informations utiles au suivi de ce client.'],
                  ].map(([key, label, hint]) => (
                    <div className={`form-group ${key === 'address' || key === 'notes' ? 'full-width' : ''}`} key={key}>
                      <label htmlFor={`client-${key}`}>{label}</label>
                      {key === 'notes' ? (
                        <textarea id={`client-${key}`} aria-describedby={`client-${key}-hint`} rows="2" value={formData[key]} onChange={(event) => setFormData({ ...formData, [key]: event.target.value })} />
                      ) : (
                        <input id={`client-${key}`} aria-describedby={`client-${key}-hint`} type={key === 'email' ? 'email' : 'text'} value={formData[key]} onChange={(event) => setFormData({ ...formData, [key]: event.target.value })} required={key === 'name'} />
                      )}
                      <span className="form-hint" id={`client-${key}-hint`}>{hint}</span>
                    </div>
                  ))}
                </div>
                <div className="form-actions"><button type="submit" className="btn btn-primary">{editingId ? 'Enregistrer' : 'Ajouter le client'}</button><button type="button" className="btn btn-secondary" onClick={resetForm}>Annuler</button></div>
              </form>
            </div>
          )}

          {loading ? <div className="loading">Chargement des clients...</div> : filteredClients.length === 0 ? <div className="empty-state"><h3>Aucun client</h3><p>Ajoutez votre premier client pour retrouver rapidement ses informations.</p></div> : (
            <div className="clients-grid">
              {filteredClients.map((client) => (
                <article className="client-card" key={client.id}>
                  <div className="client-card-heading"><div><h2>{client.name}</h2><p>{client.company_name || 'Client particulier'}</p></div><div className="client-card-actions">{client.notes?.trim() && <button type="button" className="btn btn-sm btn-secondary" onClick={() => setNoteToRead(client.notes)} title="Lire les notes" aria-label={`Lire les notes de ${client.name}`}><FileText size={16} /></button>}<button type="button" className="btn btn-sm btn-edit" onClick={() => editClient(client)} title="Modifier"><Edit2 size={16} /></button></div></div>
                  <div className="client-card-details">
                    <span>{client.phone || 'Téléphone non renseigné'}</span>
                    <span>{client.email || 'E-mail non renseigné'}</span>
                    <span className={`client-balance-badge ${getClientBalance(client) <= 0 ? 'clear' : getClientBalance(client) < 10000 ? 'low' : 'high'}`}>
                      {getClientBalance(client) <= 0 ? 'À jour' : `Doit ${formatCurrency(getClientBalance(client))}`}
                    </span>
                    <button type="button" className="btn btn-secondary btn-sm client-detail-button" onClick={() => setSelectedClient(client)}>Voir la fiche</button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <NoteViewer title="Notes du client" note={noteToRead} onClose={() => setNoteToRead('')} />
          {selectedClient && <ClientDetailModal client={selectedClient} userId={user.id} accountName={account?.account_name} onClose={() => setSelectedClient(null)} onClientUpdated={loadClients} />}
        </main>
      </div>
    </div>
  );
}
