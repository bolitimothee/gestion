import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children, activeRoute }) {
  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar active={activeRoute} />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
