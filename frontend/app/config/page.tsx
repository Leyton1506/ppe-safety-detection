'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, uploadModel, type ModelStatus } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function ConfigPage() {
  const { addToast } = useToast();
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const loadStatus = async () => {
    try {
      const s = await apiGet<ModelStatus>('/model/status');
      setModelStatus(s);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error cargando estado del modelo', message: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadModel(file);
      addToast({
        type: res.success ? 'success' : 'warning',
        title: res.success ? '✅ Modelo cargado correctamente' : '⚠️ Subido pero fallo al cargar',
        message: res.message,
      });
      await loadStatus();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error subiendo modelo', message: e.message });
    } finally { setUploading(false); }
  };

  const switchModel = async (filename: string) => {
    setSwitching(true);
    try {
      await apiPost('/model/load', { model_filename: filename });
      addToast({ type: 'success', title: `✅ Modelo '${filename}' activado` });
      await loadStatus();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error cambiando modelo', message: e.message });
    } finally { setSwitching(false); }
  };

  return (
    <div className="page-content">
      <div className="page-header-responsive">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Configuración del Sistema
          </h2>
          <p className="text-secondary text-sm" style={{ marginTop: 4 }}>
            Gestión del modelo YOLO y configuración de la API
          </p>
        </div>
      </div>

      <div className="grid-responsive-2">
        {/* Model Status */}
        <div className="card">
          <div className="card-title mb-4">Estado del Modelo</div>
          {loading ? (
            <div className="empty-state"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
          ) : (
            <>
              <div style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius)',
                background: modelStatus?.model_loaded ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${modelStatus?.model_loaded ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32 }}>{modelStatus?.model_loaded ? '✅' : '❌'}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>
                      {modelStatus?.model_loaded ? 'Modelo Activo' : 'Sin Modelo Cargado'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                      {modelStatus?.current_model ?? 'Ninguno seleccionado'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Available models */}
              <div className="form-group">
                <label className="form-label">Modelos disponibles en backend/models/</label>
                {modelStatus?.available_models.length === 0 ? (
                  <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                    No hay modelos .pt en backend/models/
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {modelStatus?.available_models.map(m => (
                      <div key={m} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span>🤖</span>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{m}</span>
                          {m === modelStatus?.current_model && (
                            <span className="badge badge-resolved" style={{ fontSize: 10 }}>ACTIVO</span>
                          )}
                        </div>
                        {m !== modelStatus?.current_model && (
                          <button className="btn btn-ghost btn-sm" disabled={switching}
                            onClick={() => switchModel(m)}>
                            {switching ? <span className="loading-spinner" /> : '▶️ Activar'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Upload Model */}
        <div>
          <div className="card mb-4">
            <div className="card-title mb-4">📁 Dónde colocar tu modelo</div>
            <div style={{
              padding: '16px 20px', borderRadius: 'var(--radius)',
              background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue-light)', marginBottom: 8 }}>
                📂 Ruta del directorio de modelos:
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)',
                background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                wordBreak: 'break-all',
              }}>
                ppe-safety-detection/backend/models/
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.7 }}>
                1. Copia tu archivo <strong style={{ color: 'var(--text-secondary)' }}>.pt</strong> en esa carpeta<br/>
                2. Reinicia la API o usa &quot;Subir Modelo&quot; abajo<br/>
                3. Se cargará automáticamente al iniciar
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title mb-4">⬆️ Subir Modelo (.pt)</div>
            <label
              htmlFor="model-upload"
              className="upload-zone"
              style={{ cursor: 'pointer', padding: 28 }}
            >
              <input id="model-upload" type="file" accept=".pt" style={{ display: 'none' }}
                onChange={handleModelUpload} />
              <div className="upload-zone-icon">🤖</div>
              {uploading ? (
                <div>
                  <div className="loading-spinner" style={{ margin: '0 auto 8px' }} />
                  <p>Subiendo y cargando modelo...</p>
                </div>
              ) : (
                <div>
                  <h3>Arrastra tu modelo .pt aquí</h3>
                  <p>O haz clic para seleccionar el archivo</p>
                  <div className="upload-types" style={{ marginTop: 12 }}>
                    <span className="upload-type-badge">.pt</span>
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Model Classes */}
      {modelStatus?.classes && modelStatus.classes.length > 0 && (
        <div className="card mt-4">
          <div className="card-title mb-4">Clases detectadas por el modelo ({modelStatus.classes.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {modelStatus.classes.map((cls, i) => (
              <span key={i} style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                background: 'rgba(59,130,246,0.08)', color: 'var(--accent-blue-light)',
                border: '1px solid rgba(59,130,246,0.2)', fontFamily: 'JetBrains Mono, monospace',
              }}>
                {cls}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* API Info */}
      <div className="card mt-4">
        <div className="card-title mb-4">🌐 Información de la API</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { label: 'URL Base', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000' },
            { label: 'Documentación', value: 'http://localhost:8000/docs' },
            { label: 'ReDoc', value: 'http://localhost:8000/redoc' },
            { label: 'Health Check', value: 'http://localhost:8000/health' },
          ].map(item => (
            <div key={item.label} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
              <a href={item.value} target="_blank" rel="noreferrer"
                style={{ fontSize: 13, color: 'var(--accent-blue-light)', fontFamily: 'JetBrains Mono, monospace', textDecoration: 'none' }}>
                {item.value}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
