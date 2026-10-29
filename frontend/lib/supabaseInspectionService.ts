import { supabase } from './supabaseClient';
import type { Detection } from './api';

export interface WebInspectionInput {
  file: File | Blob;
  imageWidth: number;
  imageHeight: number;
  inferenceTimeMs: number;
  totalDetections: number;
  complianceSummary: {
    compliance_rate: number;
    has_violations: boolean;
    persons_count: number;
    ppe_count: number;
    [key: string]: any;
  };
  detections: Detection[] | any[];
}

export interface SupabaseInspection {
  id: string;
  createdAt: string;
  imagePath: string;
  imageUrl?: string;
  imageWidth: number;
  imageHeight: number;
  inferenceTimeMs: number;
  totalDetections: number;
  complianceSummary: any;
  detections: any[];
}

export const DEFAULT_EPP_DEFINITIONS = [
  { category: 'helmet', label: 'Casco' },
  { category: 'gloves', label: 'Guantes' },
  { category: 'vest', label: 'Chaleco' },
  { category: 'boots', label: 'Botas de seguridad' },
  { category: 'goggles', label: 'Gafas de seguridad' },
] as const;

export const supabaseInspectionService = {
  /**
   * Guarda una inspección realizada en la web en Supabase, sincronizada con la app móvil.
   */
  async saveInspection(input: WebInspectionInput): Promise<{ id?: string; storagePath: string }> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) {
      throw new Error('Debes iniciar sesión para sincronizar la inspección en la base de datos.');
    }

    const extension = input.file instanceof File && input.file.name.includes('.')
      ? input.file.name.split('.').pop()?.toLowerCase() || 'jpg'
      : 'jpg';

    const contentType =
      extension === 'png'
        ? 'image/png'
        : extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

    const imageName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const storagePath = `${user.id}/${imageName}`;

    let uploadPayload: Blob | ArrayBuffer = input.file;
    if (typeof window !== 'undefined' && input.file instanceof Blob) {
      uploadPayload = await input.file.arrayBuffer();
    }

    // 1. Subir la imagen al bucket 'inspection-images'
    const { error: uploadError } = await supabase.storage
      .from('inspection-images')
      .upload(storagePath, uploadPayload, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`No se pudo subir la imagen a Supabase Storage: ${uploadError.message}`);
    }

    const rawCS = input.complianceSummary || {};
    const violationsRaw = Array.isArray(rawCS.violations)
      ? rawCS.violations
      : (input.detections || []).filter((d: any) => d.is_violation || d.isViolation);

    const violationsList: string[] = violationsRaw.map((v: any) => {
      if (typeof v === 'string') return v;
      return v.label || v.className || v.category || 'Infracción de EPP';
    });

    const missingList: string[] = (
      Array.isArray(rawCS.missingItems)
        ? rawCS.missingItems
        : (rawCS.missing_ppe || violationsList)
    ).map((m: any) => (typeof m === 'string' ? m : (m.label || m.category || 'EPP Faltante')));

    const imgW = Number(input.imageWidth || 640);
    const imgH = Number(input.imageHeight || 640);
    const personsCount = Number(rawCS.personsCount ?? rawCS.persons_count ?? (input.detections || []).filter((d: any) => d.category === 'person').length);
    const ppeCount = Number(rawCS.ppeCount ?? rawCS.ppe_count ?? (input.detections || []).filter((d: any) => d.category !== 'person' && !d.is_violation).length);

    // Normalizar detections con className, classId y box normalizado (0 a 1) para mobile
    const normalizedDetections = (input.detections || []).map((d: any, idx: number) => {
      const x1 = Math.round(d.bbox?.x1 ?? d.box?.x ?? d.box?.left ?? 0);
      const y1 = Math.round(d.bbox?.y1 ?? d.box?.y ?? d.box?.top ?? 0);
      const x2 = Math.round(d.bbox?.x2 ?? ((d.box?.x ?? d.box?.left ?? 0) + (d.box?.width ?? 0)));
      const y2 = Math.round(d.bbox?.y2 ?? ((d.box?.y ?? d.box?.top ?? 0) + (d.box?.height ?? 0)));
      const pixelW = Math.round(d.box?.width ?? Math.max(0, x2 - x1));
      const pixelH = Math.round(d.box?.height ?? Math.max(0, y2 - y1));
      const label = d.label || d.className || d.name || 'objeto';
      const conf = Number((d.confidence ?? d.score ?? 0.85).toFixed(2));
      const isVio = Boolean(d.is_violation ?? d.isViolation);
      const category = d.category || 'other';

      // Coordenadas normalizadas entre 0 y 1 para que box.x <= 1 en InspectionDetailScreen.tsx
      const normX = Number((x1 / (imgW || 640)).toFixed(4));
      const normY = Number((y1 / (imgH || 640)).toFixed(4));
      const normW = Number((pixelW / (imgW || 640)).toFixed(4));
      const normH = Number((pixelH / (imgH || 640)).toFixed(4));

      return {
        classId: d.classId ?? d.class_id ?? (idx + 1),
        className: label,
        label,
        name: label,
        category,
        confidence: conf,
        score: conf,
        is_violation: isVio,
        isViolation: isVio,
        box: {
          x: normX,
          y: normY,
          width: normW,
          height: normH,
          left: normX,
          top: normY,
        },
        bbox: {
          x1,
          y1,
          x2,
          y2,
          left: x1,
          top: y1,
          width: pixelW,
          height: pixelH,
        },
        boundingBox: {
          left: x1,
          top: y1,
          width: pixelW,
          height: pixelH,
          x: x1,
          y: y1,
        },
      };
    });

    // Construcción de la evaluación de EPP requerida por InspectionDetailScreen.tsx (summary.items)
    const items = DEFAULT_EPP_DEFINITIONS.map(def => {
      const positives = normalizedDetections.filter(
        d => (d.category === def.category || d.label.toLowerCase() === def.category) && !d.is_violation
      );
      const risks = normalizedDetections.filter(
        d => d.category === `no_${def.category}` ||
          d.label.toLowerCase().includes(`no_${def.category}`) ||
          d.label.toLowerCase().includes(`sin_${def.category}`) ||
          (d.is_violation && d.category === def.category)
      );

      const isMissing = missingList.some(m => m.toLowerCase().includes(def.category));
      const riskCount = risks.length + (isMissing ? 1 : 0);
      const positiveCount = positives.length;

      let status = 'no_risk_detected';
      if (riskCount > 0) {
        status = 'possible_risk';
      } else if (positiveCount > 0) {
        status = 'detected';
      }

      const highestPosConf = positiveCount > 0 ? Math.max(...positives.map(p => p.confidence)) : null;
      const highestRiskConf = risks.length > 0 ? Math.max(...risks.map(r => r.confidence)) : (isMissing ? 1.0 : null);

      return {
        category: def.category,
        label: def.label,
        status,
        positiveDetections: positiveCount,
        riskDetections: riskCount,
        highestPositiveConfidence: highestPosConf,
        highestRiskConfidence: highestRiskConf,
      };
    });

    const hasAnyRisk = items.some(i => i.status === 'possible_risk') || violationsList.length > 0;
    const overallStatus = hasAnyRisk ? 'possible_risk' : (personsCount > 0 ? 'no_risk_detected' : 'no_risk_detected');
    const complianceRate = Number(rawCS.complianceRate ?? rawCS.compliance_rate ?? (hasAnyRisk ? 40 : 100));
    const violationsCount = items.reduce((acc, i) => acc + i.riskDetections, 0);

    const normalizedComplianceSummary = {
      overallStatus,
      personDetected: personsCount > 0,
      hasPossibleRisks: hasAnyRisk,
      hasUnconfirmedItems: false,
      totalDetections: normalizedDetections.length,
      items,
      // Retrocompatibilidad con Web
      complianceRate,
      compliance_rate: complianceRate,
      hasViolations: hasAnyRisk,
      has_violations: hasAnyRisk,
      personsCount,
      persons_count: personsCount,
      ppeCount,
      ppe_count: ppeCount,
      violationsCount,
      violations_count: violationsCount,
      missingItems: missingList,
      violations: violationsList,
      passed: !hasAnyRisk,
    };

    // 2. Insertar en la tabla 'inspections' idéntica a la app móvil
    const { data: insertedData, error: insertError } = await supabase
      .from('inspections')
      .insert({
        user_id: user.id,
        image_path: storagePath,
        image_width: imgW,
        image_height: imgH,
        inference_time_ms: Number((input.inferenceTimeMs || 120.0).toFixed(1)),
        total_detections: normalizedDetections.length,
        compliance_summary: normalizedComplianceSummary,
        detections: normalizedDetections,
      })
      .select('id')
      .single();

    if (insertError) {
      await supabase.storage.from('inspection-images').remove([storagePath]).catch(() => { });
      throw new Error(`Error al guardar en Supabase: ${insertError.message}`);
    }

    return { id: insertedData?.id, storagePath };
  },

  /**
   * Obtiene el historial de inspecciones guardadas por el usuario actual (móvil y web).
   */
  async getInspections(limit = 50): Promise<SupabaseInspection[]> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return [];

    const { data, error } = await supabase
      .from('inspections')
      .select('id, created_at, image_path, image_width, image_height, inference_time_ms, total_detections, compliance_summary, detections')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error al obtener inspecciones de Supabase:', error.message);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      imagePath: row.image_path,
      imageWidth: row.image_width,
      imageHeight: row.image_height,
      inferenceTimeMs: row.inference_time_ms,
      totalDetections: row.total_detections,
      complianceSummary: row.compliance_summary,
      detections: row.detections ?? [],
    }));
  },

  /**
   * Obtiene URL firmada o pública de una imagen guardada en Supabase Storage
   */
  async getImageUrl(imagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('inspection-images')
      .createSignedUrl(imagePath, 3600);

    if (error || !data?.signedUrl) {
      const publicRes = supabase.storage.from('inspection-images').getPublicUrl(imagePath);
      return publicRes.data.publicUrl;
    }
    return data.signedUrl;
  },

  /**
   * Elimina una inspección de Supabase y su imagen asociada.
   */
  async deleteInspection(id: string, imagePath?: string): Promise<void> {
    const { error } = await supabase
      .from('inspections')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar inspección: ${error.message}`);
    }

    if (imagePath) {
      await supabase.storage.from('inspection-images').remove([imagePath]).catch(() => { });
    }
  },

  /**
   * Repara automáticamente inspecciones antiguas en Supabase que carezcan de summary.items,
   * para que la pantalla InspectionDetailScreen.tsx en la app móvil no crashee al abrirlas.
   */
  async repairExistingInspections(): Promise<number> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return 0;

    const { data: inspections, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('user_id', user.id);

    if (error || !inspections) return 0;

    let repairedCount = 0;

    for (const insp of inspections) {
      const summary = insp.compliance_summary || {};
      const needsRepair = !Array.isArray(summary.items) || !summary.overallStatus;

      if (needsRepair) {
        const detections = Array.isArray(insp.detections) ? insp.detections : [];
        const imgW = Number(insp.image_width || 640);
        const imgH = Number(insp.image_height || 640);

        const normalizedDets = detections.map((d: any, idx: number) => {
          const x1 = Math.round(d.bbox?.x1 ?? d.box?.x ?? 0);
          const y1 = Math.round(d.bbox?.y1 ?? d.box?.y ?? 0);
          const pixelW = Math.round(d.box?.width ?? 60);
          const pixelH = Math.round(d.box?.height ?? 60);
          const normX = Number((x1 / imgW).toFixed(4));
          const normY = Number((y1 / imgH).toFixed(4));
          const normW = Number((pixelW / imgW).toFixed(4));
          const normH = Number((pixelH / imgH).toFixed(4));
          const label = d.label || d.className || d.name || 'objeto';
          const conf = Number((d.confidence ?? d.score ?? 0.85).toFixed(2));
          const isVio = Boolean(d.is_violation ?? d.isViolation);

          return {
            classId: d.classId ?? (idx + 1),
            className: label,
            label,
            category: d.category || 'other',
            confidence: conf,
            score: conf,
            is_violation: isVio,
            isViolation: isVio,
            box: { x: normX, y: normY, width: normW, height: normH },
            bbox: { x1, y1, x2: x1 + pixelW, y2: y1 + pixelH },
          };
        });

        const items = DEFAULT_EPP_DEFINITIONS.map(def => {
          const positives = normalizedDets.filter(
            (d: any) => (d.category === def.category || d.label.toLowerCase() === def.category) && !d.is_violation
          );
          const risks = normalizedDets.filter(
            (d: any) => d.category === `no_${def.category}` ||
              d.label.toLowerCase().includes(`no_${def.category}`) ||
              d.label.toLowerCase().includes(`sin_${def.category}`) ||
              (d.is_violation && d.category === def.category)
          );
          const posCount = positives.length;
          const riskCount = risks.length;
          let status = 'no_risk_detected';
          if (riskCount > 0) status = 'possible_risk';
          else if (posCount > 0) status = 'detected';

          return {
            category: def.category,
            label: def.label,
            status,
            positiveDetections: posCount,
            riskDetections: riskCount,
            highestPositiveConfidence: posCount > 0 ? Math.max(...positives.map((p: any) => p.confidence)) : null,
            highestRiskConfidence: riskCount > 0 ? Math.max(...risks.map((r: any) => r.confidence)) : null,
          };
        });

        const hasAnyRisk = items.some(i => i.status === 'possible_risk');
        const updatedSummary = {
          ...summary,
          overallStatus: hasAnyRisk ? 'possible_risk' : 'no_risk_detected',
          personDetected: (summary.personsCount || summary.persons_count || 1) > 0,
          hasPossibleRisks: hasAnyRisk,
          hasUnconfirmedItems: false,
          totalDetections: normalizedDets.length,
          items,
        };

        await supabase
          .from('inspections')
          .update({
            compliance_summary: updatedSummary,
            detections: normalizedDets,
            image_width: imgW,
            image_height: imgH,
            inference_time_ms: Number((insp.inference_time_ms || 120.0).toFixed(1)),
          })
          .eq('id', insp.id);

        repairedCount++;
      }
    }

    return repairedCount;
  },
};
