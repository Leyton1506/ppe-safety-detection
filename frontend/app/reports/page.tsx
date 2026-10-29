'use client';
import { useEffect, useState } from 'react';
import { apiGet, API_BASE, type Stats } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function ReportsPage() {
  const { addToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await apiGet<Stats>('/reports/stats');
        setStats(s);
      } catch (e: any) {
        addToast({ type: 'error', title: 'Error cargando estadísticas', message: e.message });
      } finally { setLoading(false); }
    };
    load();
  }, [addToast]);

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/reports/export`);
      if (!res.ok) throw new Error('Error exportando');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safety_report_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: '📋 Reporte exportado correctamente' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error exportando', message: e.message });
    } finally { setExporting(false); }
  };

  const maxDaily = stats ? Math.max(...Object.values(stats.daily_incidents), 1) : 1;
  const days = stats ? Object.entries(stats.daily_incidents) : [];

  const compliance = stats && stats.total_incidents > 0
    ? Math.round((stats.resolved_incidents / stats.total_incidents) * 100)
    : 100;

  return (
    <div className="page-content">
      <div className="page-header-responsive">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Reportes de Seguridad
          </h2>
          <p className="text-secondary text-sm" style={{ marginTop: 4 }}>
            Estadísticas y análisis del sistema de detección EPP
          </p>
        </div>
        <button className="btn btn-primary" onClick={exportReport} disabled={exporting}>
          {exporting ? <><span className="loading-spinner" /> Exportando...</> : '📥 Exportar Reporte JSON'}
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="loading-spinner" style={{ width: 36, height: 36 }} /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="stats-grid mb-6">
            <div className="stat-card blue">
              <div className="stat-icon blue">📊</div>
              <div className="stat-info">
                <div className="stat-value blue">{stats?.total_incidents}</div>
                <div className="stat-label">Total Incidentes</div>
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-icon red">🔓</div>
              <div className="stat-info">
                <div className="stat-value red">{stats?.open_incidents}</div>
                <div className="stat-label">Abiertos</div>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green">🔒</div>
              <div className="stat-info">
                <div className="stat-value green">{stats?.resolved_incidents}</div>
                <div className="stat-label">Resueltos</div>
              </div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon purple">🔔</div>
              <div className="stat-info">
                <div className="stat-value purple">{stats?.total_alerts}</div>
                <div className="stat-label">Total Alertas</div>
              </div>
            </div>
          </div>

          <div className="grid-responsive-2">
            {/* Severity Breakdown */}
            <div className="card">
              <div className="card-title mb-4">Distribución por Severidad</div>
              {stats && Object.entries(stats.severity_breakdown).map(([key, val]) => {
                const colors: Record<string, string> = {
                  critical: 'var(--accent-red)', high: 'var(--accent-orange)',
                  medium: 'var(--accent-yellow)', low: 'var(--accent-green)',
                };
                const total = stats.total_incidents || 1;
                const pct = Math.round((val / total) * 100);
                return (
                  <div key={key} className="metric-row">
                    <div className="metric-label" style={{ fontSize: 12, textTransform: 'capitalize' }}>
                      {({ critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[key])} {key}
                    </div>
                    <div className="metric-bar-wrap">
                      <div className="metric-bar" style={{ width: `${pct}%`, background: colors[key] }} />
                    </div>
                    <div className="metric-value">{val}</div>
                  </div>
                );
              })}
            </div>

            {/* Compliance Rate */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div className="card-title mb-4">Tasa de Resolución</div>
              <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 16 }}>
                <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="12" />
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke={compliance >= 70 ? 'var(--accent-green)' : compliance >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)'}
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - compliance / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{compliance}%</span>
                </div>
              </div>
              <p className="text-secondary text-sm">Incidentes resueltos vs. total</p>
            </div>
          </div>

          {/* Daily Chart */}
          {days.length > 0 && (
            <div className="card mt-4">
              <div className="card-title mb-4">Actividad Diaria (Últimos 7 días)</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120, paddingTop: 16 }}>
                {days.map(([day, count]) => (
                  <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{count}</div>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      height: `${Math.max((count / maxDaily) * 80, 4)}px`,
                      background: 'linear-gradient(180deg, var(--accent-blue), var(--accent-cyan))',
                      opacity: 0.85,
                      transition: 'height 0.5s ease',
                    }} />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {day.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
