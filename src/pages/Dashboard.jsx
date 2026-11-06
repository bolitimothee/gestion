import React, { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { financeService } from '../services/financeService';
import { salesService } from '../services/salesService';
import { stockService } from '../services/stockService';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import Navbar from '../components/Navbar';
import { AlertCircle, Clock3, CreditCard, PackageX, TriangleAlert } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import { DollarSign, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { formatCurrency, formatDate } from '../services/formatService';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [today, setToday] = useState(null);
  const [alerts, setAlerts] = useState({ out: [], low: [], pendingOrders: 0, debtors: [] });
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [financeRes, salesRes, stockRes, recentSalesRes, dailyRes, alertsRes, pendingOrdersRes, debtorsRes, trendRes, topProductsRes] = await Promise.allSettled([
        financeService.getFinancialSummary(user.id),
        salesService.getSalesCount(user.id),
        stockService.getStockValue(user.id),
        salesService.getRecentSales(user.id, 5),
        financeService.getDailySummary(user.id),
        stockService.getStockAlerts(user.id),
        orderService.getPendingCount(user.id),
        customerService.getDebtors(user.id),
        salesService.getLast7DaysRevenue(user.id),
        salesService.getTopProducts(user.id),
      ]);

      const financeResult = financeRes.status === 'fulfilled' ? financeRes.value : null;
      const salesResult = salesRes.status === 'fulfilled' ? salesRes.value : null;
      const stockResult = stockRes.status === 'fulfilled' ? stockRes.value : null;
      const recentSalesResult = recentSalesRes.status === 'fulfilled' ? recentSalesRes.value : null;
      const dailyResult = dailyRes.status === 'fulfilled' ? dailyRes.value : null;
      const alertsResult = alertsRes.status === 'fulfilled' ? alertsRes.value : null;
      const pendingOrdersResult = pendingOrdersRes.status === 'fulfilled' ? pendingOrdersRes.value : null;
      const debtorsResult = debtorsRes.status === 'fulfilled' ? debtorsRes.value : null;
      const trendResult = trendRes.status === 'fulfilled' ? trendRes.value : null;
      const topProductsResult = topProductsRes.status === 'fulfilled' ? topProductsRes.value : null;

      if (dailyResult?.data) setToday(dailyResult.data);
      setAlerts({
        out: alertsResult?.data?.out || [],
        low: alertsResult?.data?.low || [],
        pendingOrders: pendingOrdersResult?.data || 0,
        debtors: debtorsResult?.data || [],
      });
      setRevenueTrend(trendResult?.data || []);
      setTopProducts(topProductsResult?.data || []);

      if (financeResult?.error || salesResult?.error || stockResult?.error) {
        logger.error('Erreurs des services:', {
          finance: financeResult?.error,
          sales: salesResult?.error,
          stock: stockResult?.error,
        });
      }

      if (financeResult?.data && salesResult?.data !== null && stockResult?.data !== null) {
        setStats({
          revenue: financeResult.data.totalRevenue || 0,
          netProfit: financeResult.data.netProfit || 0,
          stockValue: stockResult.data || 0,
          salesCount: salesResult.data || 0,
        });
      }

      if (recentSalesResult?.data) {
        setRecentSales(recentSalesResult.data || []);
      } else if (recentSalesResult?.error) {
        logger.warn('Erreur getRecentSales:', recentSalesResult.error);
      }

      if (!financeResult?.data && !salesResult?.data && !stockResult?.data) {
        setError('Erreur lors du chargement des données. Vérifiez que les tables Supabase sont créées.');
      }
    } catch (error) {
      logger.error('Error loading dashboard:', error);
      setError('Erreur système lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    if (user) {
      timeoutId = setTimeout(() => {
        if (isMounted) {
          loadDashboardData();
        }
      }, 0);
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user, loadDashboardData]);

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/dashboard" />
        <main className="main-content dashboard-page">
          <div className="page-header">
            <div className="page-header-content">
              <h1>Tableau de Bord</h1>
            </div>
          </div>

          {loading ? (
            <div className="loading">Chargement des données...</div>
          ) : error ? (
            <div className="error-container" style={{ padding: '20px', backgroundColor: '#fee', borderRadius: '8px', color: '#c33', marginTop: '20px' }}>
              <h3>⚠️ Erreur lors du chargement</h3>
              <p>{error}</p>
              <small>Vérifiez la console (F12) pour plus de détails.</small>
            </div>
          ) : stats ? (
            <>
              <div className="stats-grid">
                <StatCard
                  title="Chiffre d'Affaires"
                  value={formatCurrency(stats.revenue)}
                  icon={DollarSign}
                  color="blue"
                />
                <StatCard
                  title="Bénéfice Net"
                  value={formatCurrency(stats.netProfit)}
                  icon={TrendingUp}
                  color="green"
                />
                <StatCard
                  title="Valeur du Stock"
                  value={formatCurrency(stats.stockValue)}
                  icon={Package}
                  color="orange"
                />
                <StatCard
                  title="Ventes Totales"
                  value={stats.salesCount}
                  icon={ShoppingCart}
                  color="purple"
                />
              </div>

              {today && (
                <section className="dashboard-section dashboard-today">
                  <h2>Aujourd'hui</h2>
                  <div className="stats-grid">
                    <StatCard title="CA du jour" value={formatCurrency(today.revenue)} icon={DollarSign} color="blue" />
                    <StatCard title="Ventes" value={today.salesCount} icon={ShoppingCart} color="purple" />
                    <StatCard title="Dépenses" value={formatCurrency(today.expenses)} icon={TrendingUp} color="orange" />
                    <StatCard title="Bénéfice" value={formatCurrency(today.profit)} icon={TrendingUp} color="green" />
                  </div>
                </section>
              )}

              <section className="dashboard-section dashboard-alerts">
                <h2>À faire</h2>
                <button type="button" onClick={() => navigate('/stock')} disabled={!alerts.out.length}><PackageX className="dashboard-alert-icon" aria-hidden="true" /> <span className="dashboard-alert-label">{alerts.out.length} produit(s) en rupture</span><span className="dashboard-alert-link">Voir</span></button>
                <button type="button" onClick={() => navigate('/stock')} disabled={!alerts.low.length}><TriangleAlert className="dashboard-alert-icon" aria-hidden="true" /> <span className="dashboard-alert-label">{alerts.low.length} produit(s) en stock bas</span><span className="dashboard-alert-link">Voir</span></button>
                <button type="button" onClick={() => navigate('/orders')} disabled={!alerts.pendingOrders}><Clock3 className="dashboard-alert-icon" aria-hidden="true" /> <span className="dashboard-alert-label">{alerts.pendingOrders} commande(s) en attente</span><span className="dashboard-alert-link">Voir</span></button>
                <button type="button" onClick={() => navigate('/clients')} disabled={!alerts.debtors.length}><CreditCard className="dashboard-alert-icon" aria-hidden="true" /> <span className="dashboard-alert-label">{alerts.debtors.length} client(s) avec créance</span><span className="dashboard-alert-link">Voir</span></button>
              </section>

              <div className="dashboard-shortcuts">
                {[['Vendre', '/sales'], ['Commandes', '/orders'], ['Mes Ventes', '/sales'], ['Stock', '/stock']].map(([label, path]) => <button type="button" key={`${label}-${path}`} onClick={() => navigate(path)}>{label}</button>)}
              </div>

              <div className="dashboard-insights">
                <section className="dashboard-section dashboard-chart"><h2>CA des 7 derniers jours</h2><div className="revenue-bars">{revenueTrend.map((item) => { const max = Math.max(...revenueTrend.map((entry) => entry.amount), 1); return <div className="revenue-bar-item" key={item.date}><div className="revenue-bar" style={{ height: `${Math.max(4, (item.amount / max) * 100)}%` }} title={formatCurrency(item.amount)} /><span>{item.label}</span></div>; })}</div></section>
                <section className="dashboard-section top-products"><h2>Top 5 produits du mois</h2>{topProducts.length ? topProducts.map((product, index) => <div className="top-product-row" key={product.name}><span>{index + 1}. {product.name}</span><strong>{product.quantity}</strong></div>) : <p className="empty-message">Aucune vente ce mois-ci</p>}</section>
              </div>

              <div className="dashboard-section dashboard-recent-sales">
                <h2>Dernières Ventes</h2>
                <div className="sales-table table-responsive">
                  {recentSales.length > 0 ? (
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
                            <td className="amount" data-label="Montant">{formatCurrency(sale.total_amount)}</td>
                            <td data-label="Date">{formatDate(sale.sale_date)}</td>
                            <td data-label="Quantité">{sale.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="empty-message">Aucune vente enregistrée</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="error">Erreur lors du chargement des données</div>
          )}
        </main>
      </div>
    </div>
  );
}
