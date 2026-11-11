// Reusable UI primitives
import { memo, useEffect, useRef } from 'react';

export function Button({ variant = 'default', size, loading, children, className = '', ...props }) {
  return (
    <button className={`btn ${variant} ${size || ''} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <span className="spinner sm" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, error, as = 'input', children, ...props }) {
  const Tag = as;
  return (
    <label className="field">
      <span>{label}</span>
      {children || <Tag className={error ? 'invalid' : ''} aria-invalid={!!error} {...props} />}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export const Avatar = memo(function Avatar({ user, size = 28, title }) {
  if (!user) return <span className="avatar empty" style={{ width: size, height: size }} title="Unassigned">?</span>;
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className="avatar" title={title || user.name} style={{ width: size, height: size, background: user.color, fontSize: size * 0.4 }}>
      {initials}
    </span>
  );
});

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="center-fill" role="status">
      <span className="spinner" aria-hidden />
      <span className="muted">{label}</span>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="modal-body">
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

export function EmptyState({ children }) {
  return <p className="empty">{children}</p>;
}
