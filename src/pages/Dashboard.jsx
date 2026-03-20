/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import { salesService } from '../services/salesService';
import { stockService } from '../services/stockService';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { DollarSign, TrendingUp, Package, ShoppingCart, RefreshCw, AlertCircle, TrendingDown, Users, BarChart3, Plus } from 'lucide-react';
import './Dashboard.css';

// Formater les montants en FCFA
const formatFCFA = (amount) => {
  if (!isFinite(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
};

// Composant pour les indicateurs de performance
const PerformanceIndicator = ({ label, value, trend, icon: Icon, color }) => {
  const trendColor = trend >= 0 ? 'positive' : 'negative';
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
  
  return (
    <div className="performance-indicator">
      <div className="indicator-header">
        <div className="indicator-icon" style={{ backgroundColor: color }}>
          <Icon size={20} />
        </div>
        <div className="indicator-trend">
          <TrendIcon size={16} className={`trend-icon ${trendColor}`} />
          <span className={`trend-value ${trendColor}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        </div>
      </div>
      <div className="indicator-content">
        <h4 className="indicator-label">{label}</h4>
        <p className="indicator-value">{value}</p>
      </div>
    </div>
  );
};

// Composant pour la carte de vente récente
const RecentSaleCard = ({ sale }) => {
  const saleDate = new Date(sale.sale_date);
  const isToday = saleDate.toDateString() === new Date().toDateString();
  
  return (
    <div className="recent-sale-card">
      <div className="sale-header">
        <div className="sale-customer">
          <Users size={16} />
          <span>{sale.customer_name}</span>
        </div>
        <div className="sale-amount">
          <span className="amount-value">{formatFCFA(sale.total_amount)}</span>
        </div>
      </div>
      <div className="sale-details">
        <div className="sale-info">
          <span className="info-label">Quantité:</span>
          <span className="info-value">{sale.quantity}</span>
        </div>
        <div className="sale-info">
          <span className="info-label">Date:</span>
          <span className={`info-date ${isToday ? 'today' : ''}`}>
            {isToday ? "Aujourd'hui" : saleDate.toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [financeRes, salesRes, stockRes, recentSalesRes] = await Promise.all([
        financeService.getFinancialSummary(user.id),
        salesService.getSalesCount(user.id),
        stockService.getStockValue(user.id),
        salesService.getRecentSales(user.id, 5),
      ]);

      if (financeRes.error || salesRes.error || stockRes.error) {
        console.error('Erreurs des services:', {
          finance: financeRes.error,
          sales: salesRes.error,
          stock: stockRes.error,
        });
        setError('Erreur lors du chargement des données.');
        return;
      }

      if (financeRes.data && salesRes.data !== null && stockRes.data !== null) {
        setStats({
          revenue: financeRes.data.totalRevenue || 0,
          netProfit: financeRes.data.netProfit || 0,
          stockValue: stockRes.data || 0,
          salesCount: salesRes.data || 0,
        });
      }

      if (recentSalesRes.data) {
        setRecentSales(recentSalesRes.data || []);
      } else if (recentSalesRes.error) {
        console.warn('Erreur getRecentSales:', recentSalesRes.error);
      }
      
      setLastRefresh(new Date());
    } catch (_err) {
      console.error('Error loading dashboard:', _err);
      setError('Erreur système lors du chargement des données.');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Calculer les tendances (simulées pour l'exemple)
  const calculateTrends = () => {
    return {
      revenue: 12.5,
      profit: 8.3,
      stock: -2.1,
      sales: 15.7
    };
  };

  const trends = calculateTrends();

  return (
    <Layout activeRoute="/dashboard">
      <div className="dashboard-page">
        {/* Header du dashboard */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Tableau de Bord</h1>
              <p>Vue d'ensemble de votre activité commerciale</p>
            </div>
            <div className="header-actions">
              <button 
                onClick={loadDashboardData}
                className="btn-refresh"
                disabled={loading}
                title="Actualiser les données"
              >
                <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                Actualiser
              </button>
              {lastRefresh && (
                <span className="last-refresh">
                  Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des données du tableau de bord...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-content">
              <AlertCircle size={48} />
              <h3>Erreur lors du chargement</h3>
              <p>{error}</p>
              <button onClick={loadDashboardData} className="btn-retry">
                <RefreshCw size={16} />
                Réessayer
              </button>
            </div>
          </div>
        ) : stats ? (
          <div className="dashboard-content">
            {/* Section des statistiques principales */}
            <div className="stats-section">
              <div className="section-header">
                <h2>
                  <BarChart3 size={24} />
                  Indicateurs Clés
                </h2>
                <p>Vue d'ensemble de vos performances</p>
              </div>
              
              <div className="stats-grid-enhanced">
                <PerformanceIndicator
                  label="Chiffre d'Affaires"
                  value={formatFCFA(stats.revenue)}
                  trend={trends.revenue}
                  icon={DollarSign}
                  color="#3b82f6"
                />
                <PerformanceIndicator
                  label="Bénéfice Net"
                  value={formatFCFA(stats.netProfit)}
                  trend={trends.profit}
                  icon={TrendingUp}
                  color="#10b981"
                />
                <PerformanceIndicator
                  label="Valeur du Stock"
                  value={formatFCFA(stats.stockValue)}
                  trend={trends.stock}
                  icon={Package}
                  color="#f59e0b"
                />
                <PerformanceIndicator
                  label="Ventes Totales"
                  value={stats.salesCount}
                  trend={trends.sales}
                  icon={ShoppingCart}
                  color="#8b5cf6"
                />
              </div>
            </div>

            {/* Section des ventes récentes */}
            <div className="recent-sales-section">
              <div className="section-header">
                <div className="header-left">
                  <h2>
                    <ShoppingCart size={24} />
                    Ventes Récentes
                  </h2>
                  <p>Les dernières transactions enregistrées</p>
                </div>
                <div className="header-right">
                  <span className="sales-count">
                    {recentSales.length} vente{recentSales.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="recent-sales-grid">
                {recentSales.length > 0 ? (
                  recentSales.map((sale) => (
                    <RecentSaleCard key={sale.id} sale={sale} />
                  ))
                ) : (
                  <div className="empty-sales">
                    <ShoppingCart size={48} />
                    <h3>Aucune vente enregistrée</h3>
                    <p>Commencez à vendre pour voir vos transactions ici</p>
                    <button className="btn-primary">
                      <Plus size={16} />
                      Enregistrer une vente
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Section résumé financier */}
            <div className="financial-summary-section">
              <div className="section-header">
                <h2>
                  <DollarSign size={24} />
                  Résumé Financier
                </h2>
                <p>Détails de vos performances financières</p>
              </div>
              
              <div className="financial-cards">
                <div className="financial-card revenue">
                  <div className="card-header">
                    <span className="card-title">Revenus Totaux</span>
                    <DollarSign size={20} />
                  </div>
                  <div className="card-content">
                    <span className="card-amount">{formatFCFA(stats.revenue)}</span>
                    <span className="card-trend positive">+{trends.revenue}%</span>
                  </div>
                </div>
                
                <div className="financial-card profit">
                  <div className="card-header">
                    <span className="card-title">Bénéfice Net</span>
                    <TrendingUp size={20} />
                  </div>
                  <div className="card-content">
                    <span className="card-amount">{formatFCFA(stats.netProfit)}</span>
                    <span className="card-trend positive">+{trends.profit}%</span>
                  </div>
                </div>
                
                <div className="financial-card stock">
                  <div className="card-header">
                    <span className="card-title">Valeur Stock</span>
                    <Package size={20} />
                  </div>
                  <div className="card-content">
                    <span className="card-amount">{formatFCFA(stats.stockValue)}</span>
                    <span className="card-trend negative">{trends.stock}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="error-container">
            <AlertCircle size={48} />
            <h3>Erreur lors du chargement des données</h3>
          </div>
        )}
      </div>
    </Layout>
  );
}
