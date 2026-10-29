'use client';
import { useEffect, useState } from 'react';
import { apiGet, formatDate, severityIcon, type Stats, type Incident, type Alert } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, inc, al] = await Promise.all([
          apiGet<Stats>('/reports/stats'),
          apiGet<{ incidents: Incident[] }>('/incidents?limit=5'),
          apiGet<{ alerts: Alert[] }>('/alerts'),
        ]);
        setStats(s);
        setIncidents(inc.incidents);
        setAlerts(al.alerts.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);


  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header-responsive">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Panel de Control
          </h2>
          <p className="text-secondary text-sm" style={{ marginTop: 4 }}>
            Monitoreo en tiempo real de seguridad laboral
          </p>
        </div>
        <div suppressHydrationWarning style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {new Date().toLocaleString('es-ES')}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="loading-spinner" style={{ width: 40, height: 40 }} />
          <p className="text-secondary" style={{ marginTop: 16 }}>Cargando panel...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon blue">📊</div>
              <div className="stat-info">
                <div className="stat-value blue">{stats?.total_incidents ?? 0}</div>
                <div className="stat-label">Total Incidentes</div>
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-icon red">🚨</div>
              <div className="stat-info">
                <div className="stat-value red">{stats?.open_incidents ?? 0}</div>
                <div className="stat-label">Incidentes Abiertos</div>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green">✅</div>
              <div className="stat-info">
                <div className="stat-value green">{stats?.resolved_incidents ?? 0}</div>
                <div className="stat-label">Resueltos</div>
              </div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-icon yellow">🔔</div>
              <div className="stat-info">
                <div className="stat-value yellow">{stats?.unread_alerts ?? 0}</div>
                <div className="stat-label">Alertas Sin Leer</div>
              </div>
            </div>
          </div>

          <div className="grid-responsive-2">
            {/* Severity Breakdown */}
            <div className="card">
              <div className="card-title">Distribución por Severidad</div>
              <div style={{ marginTop: 16 }}>
                {stats && Object.entries(stats.severity_breakdown).map(([key, val]) => {
                  const total = stats.total_incidents || 1;
                  const pct = Math.round((val / total) * 100);
                  const colors: Record<string, string> = {
                    critical: 'var(--accent-red)',
                    high: 'var(--accent-orange)',
                    medium: 'var(--accent-yellow)',
                    low: 'var(--accent-green)',
                  };
                  return (
                    <div key={key} className="metric-row">
                      <div className="metric-label" style={{ textTransform: 'capitalize', fontSize: 12 }}>
                        {severityIcon(key)} {key}
                      </div>
                      <div className="metric-bar-wrap">
                        <div className="metric-bar" style={{ width: `${pct}%`, background: colors[key] }} />
                      </div>
                      <div className="metric-value">{val}</div>
                    </div>
                  );
                })}
                {stats?.total_incidents === 0 && (
                  <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '20px 0' }}>
                    Sin datos aún. Realiza tu primera detección.
                  </p>
                )}
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="card-title">Alertas Recientes</div>
                <a href="/alerts" style={{ fontSize: 12, color: 'var(--accent-blue-light)', textDecoration: 'none' }}>
                  Ver todas →
                </a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alerts.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <div className="empty-state-icon">🔔</div>
                    <p>Sin alertas por ahora</p>
                  </div>
                ) : alerts.map(a => (
                  <div key={a.id} className={`alert-item ${!a.read ? 'unread' : ''} ${a.severity}`}
                    style={{ padding: '10px 14px' }}>
                    <span className="alert-icon">{severityIcon(a.severity)}</span>
                    <div className="alert-content">
                      <div className="alert-title" style={{ fontSize: 13 }}>{a.title}</div>
                      <div className="alert-time">{formatDate(a.timestamp)}</div>
                    </div>
                    {!a.read && <div className="unread-dot" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="card mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="card-title">Incidentes Recientes</div>
              <a href="/incidents" style={{ fontSize: 12, color: 'var(--accent-blue-light)', textDecoration: 'none' }}>
                Ver todos →
              </a>
            </div>
            {incidents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🚨</div>
                <h3>Sin incidentes registrados</h3>
                <p>Ve a Detección para analizar imágenes y videos</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Personas</th>
                      <th>EPP</th>
                      <th>Severidad</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map(inc => (
                      <tr key={inc.id}>
                        <td>{inc.type === 'image_detection' ? '🖼️ Imagen' : '🎬 Video'}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                          {formatDate(inc.timestamp)}
                        </td>
                        <td>{inc.persons_count}</td>
                        <td>{inc.ppe_count}</td>
                        <td>
                          <span className={`badge badge-${inc.severity}`}>{inc.severity}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${inc.status}`}>{inc.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
