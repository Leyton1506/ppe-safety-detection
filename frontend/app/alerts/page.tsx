'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch, formatDate, relativeTime, severityIcon, type Alert } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function AlertsPage() {
  const { addToast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = async () => {
    try {
      const res = await apiGet<{ alerts: Alert[] }>(`/alerts${unreadOnly ? '?unread_only=true' : ''}`);
      setAlerts(res.alerts);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error cargando alertas', message: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [unreadOnly]);

  const markRead = async (id: string) => {
    try {
      await apiPatch(`/alerts/${id}/read`, {});
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/alerts/read-all`, { method: 'PATCH' });
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      addToast({ type: 'success', title: 'Todas las alertas marcadas como leídas' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error', message: e.message });
    }
  };

  const alertIcon = (severity: string) => {
    return { critical: '🚨', high: '⚠️', medium: '🔶', low: '🔵' }[severity] ?? '🔔';
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="page-content">
      <div className="page-header-responsive">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Centro de Alertas
          </h2>
          <p className="text-secondary text-sm" style={{ marginTop: 4 }}>
            {unreadCount > 0 ? `${unreadCount} alerta(s) sin leer` : 'Todas las alertas leídas'}
          </p>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)}
              style={{ accentColor: 'var(--accent-blue)' }} />
            Solo no leídas
          </label>
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              ✅ Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="loading-spinner" style={{ width: 36, height: 36 }} /></div>
      ) : alerts.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <div className="empty-state-icon">🔔</div>
          <h3>Sin alertas {unreadOnly ? 'sin leer' : ''}</h3>
          <p>Las alertas se generan automáticamente al detectar violaciones de EPP</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map(a => (
            <div
              key={a.id}
              className={`alert-item ${!a.read ? 'unread' : ''} ${a.severity}`}
              onClick={() => !a.read && markRead(a.id)}
            >
              <span className="alert-icon">{alertIcon(a.severity)}</span>
              <div className="alert-content">
                <div className="alert-title">{a.title}</div>
                <div className="alert-message">{a.message}</div>
                <div className="alert-meta">
                  <span className={`badge badge-${a.severity}`}>{severityIcon(a.severity)} {a.severity}</span>
                  <span className="alert-time">{formatDate(a.timestamp)}</span>
                  <span className="alert-time" style={{ color: 'var(--accent-blue-light)' }}>
                    {relativeTime(a.timestamp)}
                  </span>
                  {a.source && (
                    <span className="alert-time">Fuente: {a.source}</span>
                  )}
                </div>
              </div>
              {!a.read && <div className="unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
