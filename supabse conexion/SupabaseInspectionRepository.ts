import {
  readAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { toByteArray } from 'base64-js';

import { supabase } from './supabaseClient';

import type {
  InspectionRepository,
  SaveInspectionInput,
  InspectionHistoryItem,
} from '../../domain/repositories/InspectionRepository';

export class SupabaseInspectionRepository
  implements InspectionRepository
{
  async save(input: SaveInspectionInput): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error(
        'Debes iniciar sesión para guardar una inspección.',
      );
    }

    if (!input.imagePath) {
      throw new Error(
        'No se proporcionó la ruta local de la imagen que se va a guardar.',
      );
    }

    const extensionMatch = input.imagePath.match(/\.(jpg|jpeg|png|webp)$/i);
    const extension = extensionMatch
      ? extensionMatch[1].toLowerCase()
      : 'jpg';

    const contentType =
      extension === 'png'
        ? 'image/png'
        : extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

    const imageName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const storagePath = `${user.id}/${imageName}`;

    // Leer la imagen original como Base64.
    const base64String = await readAsStringAsync(input.imagePath, {
      encoding: EncodingType.Base64,
    });

    // Convertir Base64 a bytes binarios.
    const bytes = toByteArray(base64String);

    // Crear un ArrayBuffer con los bytes exactos.
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;

    // Subir la imagen conservando el MIME correspondiente.
    const { error: uploadError } = await supabase.storage
      .from('inspection-images')
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `No se pudo subir la imagen: ${uploadError.message}`,
      );
    }

    const { error: insertError } = await supabase
  .from('inspections')
  .insert({
    user_id: user.id,
    image_path: storagePath,
    image_width: input.imageWidth,
    image_height: input.imageHeight,
    inference_time_ms: input.inferenceTimeMs,
    total_detections: input.totalDetections,
    compliance_summary: input.complianceSummary,
    detections: input.detections,
  });

    if (insertError) {
      // Evitar dejar una imagen huérfana si falla el registro.
      const { error: cleanupError } = await supabase.storage
        .from('inspection-images')
        .remove([storagePath]);

      if (cleanupError) {
        console.error(
          'No se pudo eliminar la imagen tras fallar el registro:',
          cleanupError.message,
        );
      }

      throw new Error(
        `La imagen se subió, pero no se pudo guardar la inspección: ${insertError.message}`,
      );
    }
  }

  async getHistory(): Promise<InspectionHistoryItem[]> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error(
        'Debes iniciar sesión para consultar el historial.',
      );
    }

    const { data, error } = await supabase
      .from('inspections')
      .select(
  'id, created_at, image_path, image_width, image_height, inference_time_ms, total_detections, compliance_summary, detections',
)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `No se pudo consultar el historial: ${error.message}`,
      );
    }

    return (data ?? []).map((row) => ({
  id: row.id,
  createdAt: row.created_at,
  imagePath: row.image_path,
  imageWidth: row.image_width,
  imageHeight: row.image_height,
  inferenceTimeMs: row.inference_time_ms,
  totalDetections: row.total_detections,
  complianceSummary:
    row.compliance_summary as InspectionHistoryItem['complianceSummary'],
  detections: (row.detections ?? []) as InspectionHistoryItem['detections'],
}));
  }
  
  async getImageUrl(imagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('inspection-images')
      .createSignedUrl(imagePath, 3600);

    if (error) {
      throw new Error(
        `No se pudo obtener la imagen de la inspección: ${error.message}`,
      );
    }

    return data.signedUrl;
  }

}

export const supabaseInspectionRepository =
  new SupabaseInspectionRepository();