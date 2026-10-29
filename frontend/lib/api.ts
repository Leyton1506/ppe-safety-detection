// API base URL — change this if your FastAPI is on a different port
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ────────────── Types ──────────────────────────────────────────────────────────

export interface Detection {
  label: string;
  category: string;
  confidence: number;
  is_violation?: boolean;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

export interface DetectionResult {
  id: string;
  timestamp: string;
  original_file: string;
  result_file: string;
  image_width?: number;
  image_height?: number;
  persons_count: number;
  ppe_count: number;
  total_detections: number;
  detections: Detection[];
  compliance_rate: number;
  has_violations: boolean;
  missing_ppe?: string[];
}

export interface VideoDetectionResult {
  id: string;
  timestamp: string;
  original_file: string;
  result_file: string;
  thumbnail_file?: string;
  image_width?: number;
  image_height?: number;
  total_frames: number;
  frames_analyzed: number;
  frame_results: { frame: number; detections: Detection[] }[];
  summary: { unique_persons: number; ppe_detections: number };
  persons_count?: number;
  ppe_count?: number;
  violations_count?: number;
  has_violations?: boolean;
  compliance_rate?: number;
  detections?: Detection[];
}

export interface Incident {
  id: string;
  type: 'image_detection' | 'video_detection';
  timestamp: string;
  original_file: string;
  result_file: string;
  persons_count: number;
  ppe_count: number;
  compliance_rate?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved' | 'closed';
  notes: string;
  violations?: Detection[];
}

export interface Alert {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  incident_id?: string;
  read: boolean;
}

export interface Stats {
  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  total_alerts: number;
  unread_alerts: number;
  daily_incidents: Record<string, number>;
  severity_breakdown: { critical: number; high: number; medium: number; low: number };
}

export interface ModelStatus {
  model_loaded: boolean;
  current_model: string | null;
  available_models: string[];
  classes: string[];
}

// ────────────── API helpers ────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
}

export async function detectImage(
  file: File,
  conf = 0.25,
  saveIncident = false,
  requiredPpe = 'helmet,vest,gloves'
): Promise<DetectionResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('conf', String(conf));
  form.append('save_incident', String(saveIncident));
  form.append('required_ppe', requiredPpe);
  const res = await fetch(`${API_BASE}/detect/image`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function detectVideo(file: File, conf = 0.25, sampleRate = 30): Promise<VideoDetectionResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('conf', String(conf));
  form.append('sample_rate', String(sampleRate));
  const res = await fetch(`${API_BASE}/detect/video`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function uploadModel(file: File): Promise<{ success: boolean; filename: string; message: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/model/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ────────────── Formatters ─────────────────────────────────────────────────────

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)} días`;
}

export function severityLabel(s: string) {
  return { critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo' }[s] ?? s;
}

export function statusLabel(s: string) {
  return { open: 'Abierto', resolved: 'Resuelto', closed: 'Cerrado' }[s] ?? s;
}

export function complianceColor(rate: number) {
  if (rate >= 80) return 'good';
  if (rate >= 50) return 'warning';
  return 'danger';
}

export function categoryIcon(cat: string) {
  const icons: Record<string, string> = {
    helmet: '⛑️', vest: '🦺', gloves: '🧤', boots: '🥾',
    mask: '😷', goggles: '🥽', person: '👷', other: '🔵',
    no_helmet: '❌⛑️', no_gloves: '❌🧤', no_boots: '❌🥾', no_goggles: '❌🥽', no_vest: '❌🦺',
  };
  return icons[cat] ?? '⚠️';
}

export function severityIcon(s: string) {
  return { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[s] ?? '⚪';
}
