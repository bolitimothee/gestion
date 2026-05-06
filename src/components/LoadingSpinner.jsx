import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-circle">
          <div className="spinner-arc arc-1"></div>
          <div className="spinner-arc arc-2"></div>
          <div className="spinner-arc arc-3"></div>
        </div>
      </div>
      <div className="loading-text">
        <h2>Chargement en cours...</h2>
        <p>Gestion de Commerce</p>
      </div>
    </div>
  );
}
