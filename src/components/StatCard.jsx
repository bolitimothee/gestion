import React from 'react';
import './StatCard.css';

export default function StatCard({ title, value, icon, color, trend }) {
  const Icon = icon;

  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-header">
        {Icon && (
          <div className="stat-icon" aria-hidden="true">
            <Icon size={18} />
          </div>
        )}
        <p className="stat-title">{title}</p>
      </div>
      <div className="stat-content">
        <h3 className="stat-value">{value}</h3>
        {trend && (
          <span className={`stat-trend ${trend.startsWith('-') ? 'negative' : trend.startsWith('+') ? 'positive' : ''}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}