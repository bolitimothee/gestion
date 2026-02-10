/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import { salesService } from '../services/salesService';
import { stockService } from '../services/stockService';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import { DollarSign, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import './Dashboard.css';

// Formater les montants en FCFA
const formatFCFA = (amount) => {
  if (!isFinite(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
};

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

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active="/dashboard" />
        <main className="main-content">
          <div className="page-header">
            <div style={{ flex: 1 }}>
              <h1>Tableau de Bord</h1>
              <p>Gestion des stocks et finances en FCFA</p>
            </div>
          </div>

          {loading ? (
            <div className="loading">Chargement des données...</div>
          ) : error ? (
            <div className="error-container" style={{ padding: '20px', backgroundColor: '#fee', borderRadius: '8px', color: '#c33', marginTop: '20px' }}>
              <h3>⚠️ Erreur lors du chargement</h3>
              <p>{error}</p>
            </div>
          ) : stats ? (
            <>
              <div className="stats-grid">
                <StatCard
                  title="Chiffre d'Affaires"
                  value={formatFCFA(stats.revenue)}
                  icon={DollarSign}
                  color="blue"
                />
                <StatCard
                  title="Bénéfice Net"
                  value={formatFCFA(stats.netProfit)}
                  icon={TrendingUp}
                  color="green"
                />
                <StatCard
                  title="Valeur du Stock"
                  value={formatFCFA(stats.stockValue)}
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
                            <td className="amount" data-label="Montant">{formatFCFA(sale.total_amount)}</td>
                            <td data-label="Date">{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</td>
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
