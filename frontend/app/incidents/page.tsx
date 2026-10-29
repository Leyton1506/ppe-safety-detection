'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiDelete, formatDate, severityIcon, type Incident } from '@/lib/api';
import { supabaseInspectionService, type SupabaseInspection } from '@/lib/supabaseInspectionService';
import { useToast } from '@/contexts/ToastContext';

type TabView = 'local' | 'supabase';

export default function IncidentsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabView>('local');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [supabaseInspections, setSupabaseInspections] = useState<SupabaseInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Incident | null>(null);
  const [selectedSupabase, setSelectedSupabase] = useState<SupabaseInspection | null>(null);
  const [supabaseImgUrl, setSupabaseImgUrl] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editSeverity, setEditSeverity] = useState('');

  const loadLocal = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/incidents?status=${statusFilter}` : '/incidents';
      const res = await apiGet<{ incidents: Incident[] }>(url);
      setIncidents(res.incidents);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error cargando incidentes locales', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const loadSupabase = async () => {
    try {
      setLoading(true);
      await supabaseInspectionService.repairExistingInspections().catch(() => {});
      const data = await supabaseInspectionService.getInspections();
      setSupabaseInspections(data);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error cargando desde Supabase', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'local') {
      loadLocal();
    } else {
      loadSupabase();
    }
  }, [activeTab, statusFilter]);

  const viewSupabaseDetail = async (item: SupabaseInspection) => {
    setSelectedSupabase(item);
    setSupabaseImgUrl(null);
    try {
      if (item.imagePath) {
        const url = await supabaseInspectionService.getImageUrl(item.imagePath);
        setSupabaseImgUrl(url);
      }
    } catch (err: any) {
      console.warn('Error al obtener URL de imagen:', err);
    }
  };

  const deleteSupabase = async (id: string, imagePath: string) => {
    if (!confirm('¿Eliminar esta inspección de Supabase y de la App Móvil?')) return;
    try {
      await supabaseInspectionService.deleteInspection(id, imagePath);
      addToast({ type: 'success', title: 'Inspección eliminada de Supabase' });
      loadSupabase();
      if (selectedSupabase?.id === id) setSelectedSupabase(null);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error al eliminar', message: e.message });
    }
  };

  const openModal = (inc: Incident) => {
    setSelected(inc);
    setEditNotes(inc.notes || '');
    setEditStatus(inc.status);
    setEditSeverity(inc.severity);
  };

  const saveChanges = async () => {
    if (!selected) return;
    try {
      await apiPatch(`/incidents/${selected.id}`, {
        status: editStatus, notes: editNotes, severity: editSeverity,
      });
      addToast({ type: 'success', title: 'Incidente actualizado' });
      setSelected(null);
      loadLocal();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error guardando', message: e.message });
    }
  };

  const deleteIncident = async (id: string) => {
    if (!confirm('¿Eliminar este incidente?')) return;
    try {
      await apiDelete(`/incidents/${id}`);
      addToast({ type: 'success', title: 'Incidente eliminado' });
      loadLocal();
      if (selected?.id === id) setSelected(null);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error eliminando', message: e.message });
    }
  };

  return (
    <div className="page-content">
      <div className="page-header-responsive">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Revisión de Incidentes e Inspecciones
          </h2>
          <p className="text-secondary text-sm" style={{ marginTop: 4 }}>
            Monitorea los incidentes locales y las inspecciones sincronizadas con la App Móvil
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {activeTab === 'local' ? (
            <select
              className="form-select"
              style={{ width: 180 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="open">Abiertos</option>
              <option value="resolved">Resueltos</option>
              <option value="closed">Cerrados</option>
            </select>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const count = await supabaseInspectionService.repairExistingInspections();
                    addToast({ type: 'success', title: `🛠️ ${count} inspección(es) sincronizadas con formato móvil` });
                    await loadSupabase();
                  } catch (err: any) {
                    addToast({ type: 'error', title: 'Error al sincronizar', message: err.message });
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{ border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                title="Repara inspecciones antiguas para que no cierren la app móvil"
              >
                🛠️ Reparar para Móvil
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={loadSupabase}
                style={{ border: '1px solid var(--border)' }}
              >
                🔄 Recargar Supabase
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          className={`tab ${activeTab === 'local' ? 'active' : ''}`}
          onClick={() => setActiveTab('local')}
        >
          🚨 Incidentes Locales ({incidents.length})
        </button>
        <button
          className={`tab ${activeTab === 'supabase' ? 'active' : ''}`}
          onClick={() => setActiveTab('supabase')}
        >
          📱 Inspecciones Supabase / App Móvil ({supabaseInspections.length})
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" style={{ width: 36, height: 36 }} />
          </div>
        ) : activeTab === 'local' ? (
          incidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🚨</div>
              <h3>Sin incidentes locales</h3>
              <p>Los incidentes aparecerán aquí después de realizar detecciones en el servidor local</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Fecha/Hora</th>
                    <th>Personas</th>
                    <th>EPP</th>
                    <th>Cumplimiento</th>
                    <th>Severidad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(inc => (
                    <tr key={inc.id}>
                      <td>{inc.type === 'image_detection' ? '🖼️ Imagen' : '🎬 Video'}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                        {formatDate(inc.timestamp)}
                      </td>
                      <td style={{ fontWeight: 700 }}>{inc.persons_count}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{inc.ppe_count}</td>
                      <td>
                        {inc.compliance_rate !== undefined ? (
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color:
                                inc.compliance_rate >= 80
                                  ? 'var(--accent-green)'
                                  : inc.compliance_rate >= 50
                                  ? 'var(--accent-yellow)'
                                  : 'var(--accent-red)',
                            }}
                          >
                            {inc.compliance_rate}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${inc.severity}`}>
                          {severityIcon(inc.severity)} {inc.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${inc.status}`}>{inc.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openModal(inc)}>
                            ✏️ Editar
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteIncident(inc.id)}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB SUPABASE */
          supabaseInspections.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📱</div>
              <h3>Sin inspecciones en Supabase</h3>
              <p>Las inspecciones guardadas desde la app móvil o el estudio web sincronizado aparecerán aquí.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Origen</th>
                    <th>Fecha/Hora</th>
                    <th>Total Detecciones</th>
                    <th>Cumplimiento</th>
                    <th>Tiempo Inferencia</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {supabaseInspections.map(insp => {
                    const compRate =
                      insp.complianceSummary?.compliance_rate ??
                      insp.complianceSummary?.complianceRate ??
                      (insp.complianceSummary?.has_violations ? 40 : 100);

                    return (
                      <tr key={insp.id}>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: 'var(--accent-cyan)',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            ☁️ Supabase / App Móvil
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                          {insp.createdAt ? formatDate(insp.createdAt) : '—'}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-yellow)' }}>
                          {insp.totalDetections ?? 0}
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color:
                                compRate >= 80
                                  ? 'var(--accent-green)'
                                  : compRate >= 50
                                  ? 'var(--accent-yellow)'
                                  : 'var(--accent-red)',
                            }}
                          >
                            {compRate}%
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                          {insp.inferenceTimeMs ? `${insp.inferenceTimeMs} ms` : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => viewSupabaseDetail(insp)}
                            >
                              👁️ Ver
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              title="Eliminar de Supabase y Móvil"
                              onClick={() => deleteSupabase(insp.id, insp.imagePath)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Supabase Detail Modal */}
      {selectedSupabase && (
        <div
          className="modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedSupabase(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">📱 Inspección Supabase (App Móvil & Web)</div>
              <button className="modal-close" onClick={() => setSelectedSupabase(null)}>
                ✕
              </button>
            </div>

            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              <div><strong>ID:</strong> {selectedSupabase.id}</div>
              <div><strong>Fecha:</strong> {selectedSupabase.createdAt ? formatDate(selectedSupabase.createdAt) : '—'}</div>
              <div><strong>Ruta Storage:</strong> {selectedSupabase.imagePath}</div>
            </div>

            {/* Image Preview */}
            <div
              style={{
                background: '#040711',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 240,
                maxHeight: 360,
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              {supabaseImgUrl ? (
                <img
                  src={supabaseImgUrl}
                  alt="Inspección Supabase"
                  style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain', borderRadius: 6 }}
                />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 10px' }} />
                  Cargando imagen desde bucket de Supabase...
                </div>
              )}
            </div>

            {/* Detections Summary */}
            <div className="card" style={{ padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                Detecciones Registradas ({selectedSupabase.detections?.length ?? 0})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(selectedSupabase.detections ?? []).map((det: any, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 14,
                      padding: '3px 10px',
                      fontSize: 11,
                      color: '#ffffff',
                    }}
                  >
                    {det.label ?? det.category ?? `Item #${idx + 1}`} ({Math.round((det.confidence ?? 1) * 100)}%)
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedSupabase(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Local Incident Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">📋 Editar Incidente</div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ marginBottom: 20, padding: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>ID: {selected.id}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(selected.timestamp)}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                <option value="open">Abierto</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Severidad</label>
              <select className="form-select" value={editSeverity} onChange={e => setEditSeverity(e.target.value)}>
                <option value="low">🟢 Bajo</option>
                <option value="medium">🟡 Medio</option>
                <option value="high">🟠 Alto</option>
                <option value="critical">🔴 Crítico</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notas del investigador</label>
              <textarea className="form-textarea" value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Agrega observaciones, acciones tomadas o notas de seguimiento..." />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveChanges}>💾 Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
