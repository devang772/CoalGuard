import { apiFetch } from "./api";
import { InspectionData } from "../types";
import {
  savePendingInspection,
  saveToInspectionHistory,
  removePendingInspection,
  getInspectionHistory,
} from "./offlineStorage";
import { uploadMultiplePhotos } from "./upload";

export async function submitInspection(
  inspection: InspectionData
): Promise<{ success: boolean; isOfflineSaved: boolean; message: string }> {
  try {
    // Attempt photo uploads first
    if (inspection.photos && inspection.photos.length > 0) {
      await uploadMultiplePhotos(inspection.photos);
    }

    // Try posting to backend REST API
    const response = await apiFetch<InspectionData>("/inspections", {
      method: "POST",
      body: JSON.stringify(inspection),
    });

    if (response.data && response.status === 200) {
      const syncedInspection: InspectionData = {
        ...inspection,
        synced: true,
        status: inspection.status === "PENDING_SYNC" ? "PASSED" : inspection.status,
      };
      await saveToInspectionHistory(syncedInspection);
      await removePendingInspection(inspection.id);

      return {
        success: true,
        isOfflineSaved: false,
        message: "Inspection successfully uploaded to CoalGuard Command Hub.",
      };
    }

    // If backend is unreachable (Offline mode), save locally to Pending Queue
    await savePendingInspection(inspection);
    await saveToInspectionHistory(inspection);

    return {
      success: true,
      isOfflineSaved: true,
      message: "Network unavailable. Inspection saved locally to Pending Sync Queue.",
    };
  } catch (error: any) {
    // Offline fallback
    await savePendingInspection(inspection);
    await saveToInspectionHistory(inspection);

    return {
      success: true,
      isOfflineSaved: true,
      message: "Saved to local offline queue. Will auto-sync when connected.",
    };
  }
}

export async function fetchInspectionsList(): Promise<InspectionData[]> {
  const res = await apiFetch<{ data: InspectionData[] }>("/inspections");
  if (res.data?.data && res.data.data.length > 0) {
    return res.data.data;
  }
  // Fallback to local history + mock data
  return await getInspectionHistory();
}

export async function getInspectionById(id: string): Promise<InspectionData | null> {
  const history = await getInspectionHistory();
  const found = history.find((i) => i.id === id);
  if (found) return found;

  const res = await apiFetch<InspectionData>(`/inspections/${id}`);
  return res.data;
}
