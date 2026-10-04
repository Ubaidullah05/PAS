import { useApp } from '../context/AppContext';

export default function Toasts() {
  const { toasts, dismissToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Close message">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
