import React from 'react';
import { X } from 'lucide-react';

export default function NoteViewer({ title, note, onClose }) {
  if (!note?.trim()) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-viewer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="client-form-heading">
          <h3 id="note-viewer-title">{title}</h3>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{note}</p>
      </div>
    </div>
  );
}