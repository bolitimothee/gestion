// NOUVEAU
import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, MessageCircle, Mail, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../services/formatService';
import { showToast } from '../utils/toastService';
import './ExportMenu.css';

export default function ExportMenu({
  data = [],
  columns = [],
  filename = 'export',
  title = 'Export',
  whatsappPhone = '',
  email = '',
  accountName = 'Commerce',
}) {
  const [isOpen, setIsOpen] = useState(false);

  function normaliseValue(value) {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') return value;
    return String(value);
  }

  function buildExportText() {
    const lines = [];
    lines.push(`${title}`);
    lines.push(`Entreprise: ${accountName}`);
    lines.push(`Date: ${new Date().toLocaleString('fr-FR')}`);
    lines.push('');

    data.forEach((row) => {
      const rowText = columns.map((column) => {
        const value = normaliseValue(row[column.key]);
        if (typeof value === 'number' && column.key.toLowerCase().includes('amount')) {
          return `${column.label}: ${formatCurrency(value)}`;
        }
        return `${column.label}: ${value}`;
      }).join(' | ');
      lines.push(rowText);
    });

    return lines.join('\n');
  }

  function exportToCsv() {
    if (!data.length) {
      showToast('Aucune donnée à exporter', 'error');
      return;
    }

    const header = columns.map((col) => col.label).join(';');
    const body = data.map((row) => columns.map((col) => {
      const value = normaliseValue(row[col.key]);
      const safeValue = typeof value === 'number' ? value : String(value).replace(/"/g, '""');
      return `"${safeValue}"`;
    }).join(';')).join('\n');

    const csvContent = `${header}\n${body}`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV exporté avec succès', 'success');
    setIsOpen(false);
  }

  function exportToPdf() {
    if (!data.length) {
      showToast('Aucune donnée à exporter', 'error');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Entreprise: ${accountName}`, 14, 24);
    doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, 14, 31);

    const rows = data.map((row) => columns.map((col) => {
      const value = normaliseValue(row[col.key]);
      if (typeof value === 'number' && col.key.toLowerCase().includes('amount')) {
        return formatCurrency(value);
      }
      return String(value);
    }));

    autoTable(doc, {
      head: [columns.map((col) => col.label)],
      body: rows,
      startY: 38,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 49, 82], textColor: [255, 255, 255] },
      margin: { top: 0 },
    });

    doc.save(`${filename}.pdf`);
    showToast('PDF exporté avec succès', 'success');
    setIsOpen(false);
  }

  function shareWhatsApp() {
    const message = buildExportText();
    const url = `https://wa.me/${whatsappPhone || ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showToast('Ouverture WhatsApp', 'success');
    setIsOpen(false);
  }

  function sendEmail() {
    const subject = encodeURIComponent(`${title} - ${new Date().toISOString().split('T')[0]}`);
    const body = encodeURIComponent(buildExportText());
    const url = `mailto:${email || ''}?subject=${subject}&body=${body}`;
    window.location.href = url;
    showToast('Ouverture du client e-mail', 'success');
    setIsOpen(false);
  }

  function printReport() {
    window.print();
    showToast('Impression lancée', 'success');
    setIsOpen(false);
  }

  const actions = [
    { label: 'PDF', icon: FileText, action: exportToPdf },
    { label: 'Excel/CSV', icon: FileSpreadsheet, action: exportToCsv },
    { label: 'WhatsApp', icon: MessageCircle, action: shareWhatsApp },
    { label: 'Email', icon: Mail, action: sendEmail },
    { label: 'Imprimer', icon: Printer, action: printReport },
  ];

  return (
    <div className="export-menu">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Exporter les données"
      >
        <Download size={18} />
        Exporter
      </button>

      {isOpen && (
        <div
          className="export-menu-dropdown"
        >
          {actions.map(({ label, icon, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="export-menu-action"
            >
              {React.createElement(icon, { size: 16 })}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
