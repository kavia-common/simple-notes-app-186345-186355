import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * Notes App
 * - Split layout: left list, right editor
 * - CRUD against http://localhost:3001/notes
 * - Minimal light theme styling, inline error handling and loading states
 */

// Helpers
const API_BASE = 'http://localhost:3001';

// PUBLIC_INTERFACE
function TopNav({ onNew, onDelete, disableNew, disableDelete, loading, error }) {
  /** Top navigation bar with actions to create and delete notes. */
  return (
    <nav className="topnav" role="navigation" aria-label="Top Navigation">
      <div className="brand">
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-title">Notes</span>
      </div>
      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={onNew}
          disabled={loading || disableNew}
          aria-disabled={loading || disableNew}
          aria-busy={loading ? 'true' : 'false'}
        >
          {loading ? 'Loading…' : 'New Note'}
        </button>
        <button
          className="btn btn-danger"
          onClick={onDelete}
          disabled={loading || disableDelete}
          aria-disabled={loading || disableDelete}
        >
          Delete
        </button>
      </div>
      {error ? (
        <div className="inline-error" role="alert" aria-live="polite">
          {error}
        </div>
      ) : null}
    </nav>
  );
}

// PUBLIC_INTERFACE
function NotesList({ notes, selectedId, onSelect, loading }) {
  /** Left pane list of notes. */
  return (
    <aside className="left-pane" aria-label="Notes list">
      <div className="section-header">
        <h2>All Notes</h2>
        {loading ? <span className="badge">Syncing…</span> : null}
      </div>
      <ul className="note-items">
        {notes.length === 0 && !loading ? (
          <li className="placeholder">No notes yet. Click "New Note" to create one.</li>
        ) : null}
        {notes.map((n) => (
          <li key={n.id}>
            <button
              className={`note-item ${n.id === selectedId ? 'active' : ''}`}
              onClick={() => onSelect(n.id)}
              title={n.title || 'Untitled'}
            >
              <div className="note-title">{n.title || 'Untitled'}</div>
              <div className="note-preview">{(n.content || '').slice(0, 60)}</div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// PUBLIC_INTERFACE
function NoteEditor({
  selectedNote,
  formTitle,
  formContent,
  setFormTitle,
  setFormContent,
  onSave,
  saving,
  error,
}) {
  /** Right pane editor for the selected note. */
  if (!selectedNote) {
    return (
      <section className="right-pane empty" aria-label="Note editor">
        <div className="empty-state">
          <h3>Select a note</h3>
          <p>Choose a note from the list or create a new one.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="right-pane" aria-label="Note editor">
      <div className="editor-header">
        <h2>Edit Note</h2>
        {error ? (
          <span className="inline-error" role="alert" aria-live="polite">
            {error}
          </span>
        ) : null}
      </div>
      <div className="editor-form">
        <label className="field">
          <span className="label">Title</span>
          <input
            className="input"
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Enter a title"
            disabled={saving}
          />
        </label>
        <label className="field">
          <span className="label">Content</span>
          <textarea
            className="textarea"
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="Write your note..."
            rows={12}
            disabled={saving}
          />
        </label>
        <div className="editor-actions">
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={saving}
            aria-busy={saving ? 'true' : 'false'}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** Main app component that manages state and CRUD operations. */
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  // Load notes on mount
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/notes`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch notes (${res.status})`);
        }
        const data = await res.json();
        if (!ignore) {
          setNotes(Array.isArray(data) ? data : []);
          // Select first note by default if available
          if (Array.isArray(data) && data.length > 0) {
            setSelectedId(data[0].id);
            setFormTitle(data[0].title || '');
            setFormContent(data[0].content || '');
          }
        }
      } catch (e) {
        if (!ignore) setError(e.message || 'Unable to load notes.');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Keep form in sync when selection changes
  useEffect(() => {
    if (selectedNote) {
      setFormTitle(selectedNote.title || '');
      setFormContent(selectedNote.content || '');
    } else {
      setFormTitle('');
      setFormContent('');
    }
  }, [selectedNote]);

  // Actions
  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const handleNew = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled', content: '' }),
      });
      if (!res.ok) throw new Error(`Failed to create note (${res.status})`);
      const created = await res.json();
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setFormTitle(created.title || '');
      setFormContent(created.content || '');
    } catch (e) {
      setError(e.message || 'Unable to create note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/notes/${selectedId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Failed to delete note (${res.status})`);
      setNotes((prev) => prev.filter((n) => n.id !== selectedId));
      setSelectedId(null);
      setFormTitle('');
      setFormContent('');
    } catch (e) {
      setError(e.message || 'Unable to delete note.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/notes/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, content: formContent }),
      });
      if (!res.ok) throw new Error(`Failed to save note (${res.status})`);
      const updated = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      // form already matches inputs
    } catch (e) {
      setError(e.message || 'Unable to save note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-root">
      <TopNav
        onNew={handleNew}
        onDelete={handleDelete}
        disableNew={saving}
        disableDelete={!selectedId || saving}
        loading={loading || saving}
        error={error}
      />
      <main className="main-split">
        <NotesList
          notes={notes}
          selectedId={selectedId}
          onSelect={handleSelect}
          loading={loading}
        />
        <NoteEditor
          selectedNote={selectedNote}
          formTitle={formTitle}
          formContent={formContent}
          setFormTitle={setFormTitle}
          setFormContent={setFormContent}
          onSave={handleSave}
          saving={saving}
          error={error}
        />
      </main>
    </div>
  );
}

export default App;
