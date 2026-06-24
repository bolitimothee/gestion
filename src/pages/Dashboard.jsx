import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import { salesService } from '../services/salesService';
import { stockService } from '../services/stockService';
import Navbar from '../components/Navbar';
import { AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import { DollarSign, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { formatCurrency, formatDate } from '../services/formatService';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setError('Erreur lors du chargement des données. Vérifiez que les tables Supabase sont créées.');
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
    } catch (_err) {
      console.error('Error loading dashboard:', _err);
      setError('Erreur système lors du chargement des données.');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        loadDashboardData();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [user, loadDashboardData]);

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

              <div className="dashboard-section">
                <h2>Dernières Ventes</h2>
                <div className="sales-table">
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
