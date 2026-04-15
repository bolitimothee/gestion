import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import { salesService } from '../services/salesService';
import { stockService } from '../services/stockService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import { DollarSign, TrendingUp, Package, ShoppingCart, Globe, RefreshCw, AlertCircle, BarChart3, Plus } from 'lucide-react';
import { 
  getUserCurrency, 
  setUserCurrency, 
  getAvailableCurrencies,
  convertFinancialData,
  formatCurrencyAmount 
} from '../services/currencyService';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState(getUserCurrency());
  const [originalStats, setOriginalStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      // Timeout pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Dashboard loading timeout')), 15000)
      );

      const dataPromise = Promise.all([
        financeService.getFinancialSummary(user.id),
        salesService.getSalesCount(user.id),
        stockService.getStockValue(user.id),
        salesService.getRecentSales(user.id, 5),
      ]);

      const [financeRes, salesRes, stockRes, recentSalesRes] = await Promise.race([dataPromise, timeoutPromise]);

      if (financeRes.error || salesRes.error || stockRes.error) {
        console.error('Erreurs des services:', {
          finance: financeRes.error,
          sales: salesRes.error,
          stock: stockRes.error,
        });
        setError('Erreur lors du chargement des données. Vérifiez que les tables Supabase sont créées.');
        return;
      }

      if (financeRes.data && salesRes.data !== null && stockRes.data !== null) {
        const originalData = {
          revenue: financeRes.data.totalRevenue || 0,
          netProfit: financeRes.data.netProfit || 0,
          stockValue: stockRes.data || 0,
          salesCount: salesRes.data || 0,
          totalRevenue: financeRes.data.totalRevenue || 0,
          totalExpenses: financeRes.data.totalExpenses || 0,
        };
        
        setOriginalStats(originalData);
        
        // Convertir en devise sélectionnée
        const convertedData = convertFinancialData({
          totalRevenue: originalData.revenue,
          netProfit: originalData.netProfit,
          stockValue: originalData.stockValue,
          totalExpenses: financeRes.data.totalExpenses || 0,
        }, currency);
        
        setStats({
          revenue: convertedData.totalRevenue,
          netProfit: convertedData.netProfit,
          stockValue: convertedData.stockValue,
          salesCount: originalData.salesCount,
        });
      }

      if (recentSalesRes.data) {
        setRecentSales(recentSalesRes.data || []);
      } else if (recentSalesRes.error) {
        console.warn('Erreur getRecentSales:', recentSalesRes.error);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Dashboard loading aborted');
        return; // Ne pas afficher d'erreur pour AbortError
      } else if (err.message === 'Dashboard loading timeout') {
        console.warn('Dashboard timeout - affichage des données existantes');
        // Ne pas afficher d'erreur, juste continuer avec les données existantes
        return;
      } else {
        console.error('Error loading dashboard:', err);
        setError('Erreur système lors du chargement des données.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, currency]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    setUserCurrency(newCurrency);
    
    // Convertir les statistiques
    if (originalStats) {
      const convertedData = convertFinancialData({
        totalRevenue: originalStats.revenue,
        netProfit: originalStats.netProfit,
        stockValue: originalStats.stockValue,
        totalExpenses: originalStats.totalExpenses || 0,
      }, newCurrency);
      
      setStats({
        revenue: convertedData.totalRevenue,
        netProfit: convertedData.netProfit,
        stockValue: convertedData.stockValue,
        salesCount: originalStats.salesCount,
      });
    }
  };

  const currencies = useMemo(() => getAvailableCurrencies(), []);

  const hasData = useMemo(() => {
    return stats && (stats.revenue > 0 || stats.salesCount > 0);
  }, [stats]);

  const formatLastRefresh = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (!loading && !error && stats) {
      setLastRefresh(new Date());
    }
  }, [loading, error, stats]);

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/dashboard" />
        <main className="main-content">
          <div className="page-header">
            <div className="header-content">
              <div className="header-text">
                <h1>Tableau de Bord</h1>
                <p>Vue d'ensemble de vos performances commerciales</p>
              </div>
              <div className="header-actions">
                <button 
                  onClick={handleRefresh}
                  className="btn btn-primary"
                  disabled={loading || isRefreshing}
                >
                  <RefreshCw size={18} className={isRefreshing ? 'spinning' : ''} />
                  {isRefreshing ? 'Actualisation...' : 'Actualiser'}
                </button>
              </div>
            </div>
          </div>

          {/* Affichage du chargement */}
          {loading && !isRefreshing && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Chargement des données...</p>
            </div>
          )}

          {/* Affichage des erreurs */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Affichage des données */}
          {!loading && !error && (
            <>
              {/* Sélecteur de devise */}
              <div className="currency-section">
                <div className="section-header">
                  <h3>Devise</h3>
                  <p>Affichez les données dans votre devise préférée</p>
                </div>
                <div className="currency-selector">
                  <label htmlFor="currency-select">
                    <Globe size={16} />
                    Choisir la devise
                  </label>
                  <select
                    id="currency-select"
                    value={currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Statistiques principales */}
              {stats && (
                <div className="stats-section">
                  <div className="section-header">
                    <h3>Indicateurs Clés</h3>
                    <p>Vos performances commerciales en temps réel</p>
                  </div>
                  <div className="stats-grid">
                    <StatCard
                      title="Chiffre d'Affaires"
                      value={formatCurrencyAmount(stats.revenue, currency)}
                      icon={DollarSign}
                      color="#10b981"
                    />
                    <StatCard
                      title="Bénéfice Net"
                      value={formatCurrencyAmount(stats.netProfit, currency)}
                      icon={TrendingUp}
                      color="#3b82f6"
                    />
                    <StatCard
                      title="Valeur du Stock"
                      value={formatCurrencyAmount(stats.stockValue, currency)}
                      icon={Package}
                      color="#f59e0b"
                    />
                    <StatCard
                      title="Nombre de Ventes"
                      value={stats.salesCount}
                      icon={ShoppingCart}
                      color="#8b5cf6"
                    />
                  </div>
                </div>
              )}

              {/* Message si pas de données */}
              {stats && !hasData && (
                <div className="empty-state">
                  <BarChart3 size={48} />
                  <h3>Aucune donnée disponible</h3>
                  <p>Commencez par ajouter des produits et des ventes pour voir vos statistiques.</p>
                  <button className="btn btn-primary">
                    <Plus size={18} />
                    Ajouter des données
                  </button>
                </div>
              )}

              {/* Ventes récentes */}
              {recentSales.length > 0 && (
                <div className="recent-sales-section">
                  <div className="section-header">
                    <h3>Ventes Récentes</h3>
                    <p>Les dernières transactions enregistrées</p>
                  </div>
                  <div className="sales-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th>Montant</th>
                          <th>Date</th>
                          <th>Quantité</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSales.map((sale) => (
                          <tr key={sale.id}>
                            <td data-label="Client">{sale.customer_name}</td>
                            <td className="amount" data-label="Montant">{formatCurrencyAmount(sale.total_amount, currency)}</td>
                            <td data-label="Date">{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</td>
                            <td data-label="Quantité">{sale.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Dernière actualisation */}
              {lastRefresh && (
                <div className="last-refresh">
                  <small>Dernière actualisation: {formatLastRefresh(lastRefresh)}</small>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
