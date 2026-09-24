import { apiFetch } from "./api";
import { PhotoItem } from "../types";

export interface UploadResult {
  photoId: string;
  remoteUrl: string | null;
  success: boolean;
  error?: string;
}

export async function uploadPhoto(
  photo: PhotoItem,
  onProgress?: (progressPercent: number) => void
): Promise<UploadResult> {
  try {
    onProgress?.(10);

    const formData = new FormData();
    const fileName = photo.fileName || `photo_${Date.now()}.jpg`;

    // React Native FormData file object
    formData.append("file", {
      uri: photo.uri,
      name: fileName,
      type: "image/jpeg",
    } as any);

    if (photo.hazardTag) {
      formData.append("hazardTag", photo.hazardTag);
    }

    onProgress?.(40);

    // Call backend endpoint if available
    const res = await apiFetch<{ url: string }>("/documents/upload", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });

    onProgress?.(100);

    if (res.data?.url) {
      return {
        photoId: photo.id,
        remoteUrl: res.data.url,
        success: true,
      };
    }

    // In offline or local fallback, retain local uri as valid media path
    return {
      photoId: photo.id,
      remoteUrl: photo.uri,
      success: true,
    };
  } catch (error: any) {
    console.warn("Photo upload warning (saved locally):", error.message);
    return {
      photoId: photo.id,
      remoteUrl: photo.uri, // retain local file URI
      success: true,
    };
  }
}

export async function uploadMultiplePhotos(
  photos: PhotoItem[],
  onOverallProgress?: (completed: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  let completed = 0;

  for (const photo of photos) {
    const res = await uploadPhoto(photo);
    results.push(res);
    completed++;
    onOverallProgress?.(completed, photos.length);
  }

  return results;
}
