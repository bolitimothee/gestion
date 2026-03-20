import React from 'react';
import './StatCard.css';

export default function StatCard({ title, value, icon, color, trend }) {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-icon">
        {React.createElement(icon, { size: 24 })}
      </div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
        {trend && <span className="stat-trend">{trend}</span>}
      </div>
    </div>
  );
}
