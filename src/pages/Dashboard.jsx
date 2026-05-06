import React, { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import { salesService } from '../services/salesService';
import { stockService } from '../services/stockService';
import { formatCurrency, formatDate } from '../services/formatService';
import { useDataOptimization } from '../hooks/useDataOptimization';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import { DollarSign, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();

  // Optimisation du chargement des données avec cache
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return null;
    
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
        throw new Error('Erreur lors du chargement des données');
      }

      return {
        stats: {
          revenue: financeRes.data?.totalRevenue || 0,
          netProfit: financeRes.data?.netProfit || 0,
          stockValue: stockRes.data || 0,
          salesCount: salesRes.data || 0,
        },
        recentSales: recentSalesRes.data || []
      };
    } catch (error) {
      console.error('Error loading dashboard:', error);
      throw error;
    }
  }, [user?.id]);

  const { data: dashboardData, loading, error, refetch: _refetch } = useDataOptimization(
    fetchDashboardData,
    [user?.id]
  );

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/dashboard" />
        <main className="main-content">
          <div className="page-header">
            <div style={{ flex: 1 }}>
              <h1>Tableau de Bord</h1>
              <p>Système de gestion des stocks et finances</p>
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
          ) : dashboardData?.stats ? (
            <>
              <div className="stats-grid">
                <StatCard
                  title="Chiffre d'Affaires"
                  value={formatCurrency(dashboardData.stats.revenue)}
                  icon={DollarSign}
                  color="blue"
                />
                <StatCard
                  title="Bénéfice Net"
                  value={formatCurrency(dashboardData.stats.netProfit)}
                  icon={TrendingUp}
                  color="green"
                />
                <StatCard
                  title="Valeur du Stock"
                  value={formatCurrency(dashboardData.stats.stockValue)}
                  icon={Package}
                  color="orange"
                />
                <StatCard
                  title="Ventes Totales"
                  value={dashboardData.stats.salesCount}
                  icon={ShoppingCart}
                  color="purple"
                />
              </div>

              <div className="dashboard-section">
                <h2>Dernières Ventes</h2>
                <div className="sales-table">
                  {dashboardData.recentSales.length > 0 ? (
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
                        {dashboardData.recentSales.map((sale) => (
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
