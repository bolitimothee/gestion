import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout({ children, activeRoute }) {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-container">
        <Sidebar active={activeRoute} />
        <main className="app-main">
          <div className="main-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
