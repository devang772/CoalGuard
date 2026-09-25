import * as ImageManipulator from 'expo-image-manipulator';
import { LocationPoint } from './geo';

export interface EvidenceMetadata {
  uri: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceTime: string;
  deviceId: string;
  isMocked: boolean;
  mineName: string;
  userName: string;
}

export interface TrustScoreResult {
  score: number;
  flags: string[];
  status: 'verified' | 'needs_review' | 'suspicious';
}

/**
 * Compresses photo to max 1280px and JPEG quality 0.7
 */
export async function compressAndWatermarkPhoto(
  uri: string,
  meta: Omit<EvidenceMetadata, 'uri'>
): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.warn('Image manipulation fallback to original URI', error);
    return uri;
  }
}

/**
 * Calculates Satya Proof Trust Score (0-100) and flag warnings
 */
export function calculateTrustScore(meta: EvidenceMetadata, isInsideMine: boolean): TrustScoreResult {
  let score = 95;
  const flags: string[] = [];

  if (meta.isMocked) {
    score -= 35;
    flags.push('mock_location_detected');
  }

  if (!isInsideMine) {
    score -= 30;
    flags.push('outside_mine_boundary');
  }

  if (meta.accuracy > 30) {
    score -= 15;
    flags.push(`low_gps_accuracy_${Math.round(meta.accuracy)}m`);
  }

  // Ensure bounded score
  score = Math.max(10, Math.min(100, score));

  let status: 'verified' | 'needs_review' | 'suspicious' = 'verified';
  if (score < 60) {
    status = 'suspicious';
  } else if (score < 80) {
    status = 'needs_review';
  }

  return { score, flags, status };
}
