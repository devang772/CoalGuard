import AsyncStorage from "@react-native-async-storage/async-storage";
import { InspectionData } from "../types";
import { MOCK_INSPECTIONS } from "../constants/mockData";

const PENDING_STORAGE_KEY = "@coalguard_pending_inspections";
const HISTORY_STORAGE_KEY = "@coalguard_inspection_history";

export async function getPendingInspections(): Promise<InspectionData[]> {
  try {
    const json = await AsyncStorage.getItem(PENDING_STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error("Error reading pending inspections:", error);
    return [];
  }
}

export async function savePendingInspection(
  inspection: InspectionData
): Promise<boolean> {
  try {
    const pending = await getPendingInspections();
    const existingIndex = pending.findIndex((i) => i.id === inspection.id);

    const updatedInspection: InspectionData = {
      ...inspection,
      status: "PENDING_SYNC",
      synced: false,
    };

    if (existingIndex >= 0) {
      pending[existingIndex] = updatedInspection;
    } else {
      pending.unshift(updatedInspection);
    }

    await AsyncStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
    return true;
  } catch (error) {
    console.error("Error saving pending inspection offline:", error);
    return false;
  }
}

export async function removePendingInspection(id: string): Promise<void> {
  try {
    const pending = await getPendingInspections();
    const filtered = pending.filter((i) => i.id !== id);
    await AsyncStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing pending inspection:", error);
  }
}

export async function getInspectionHistory(): Promise<InspectionData[]> {
  try {
    const json = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    const storedHistory: InspectionData[] = json ? JSON.parse(json) : [];
    // Combine mock data with stored local history for comprehensive demo experience
    const ids = new Set(storedHistory.map((i) => i.id));
    const merged = [...storedHistory];
    for (const mockItem of MOCK_INSPECTIONS) {
      if (!ids.has(mockItem.id)) {
        merged.push(mockItem);
      }
    }
    return merged;
  } catch (error) {
    return MOCK_INSPECTIONS;
  }
}

export async function saveToInspectionHistory(
  inspection: InspectionData
): Promise<void> {
  try {
    const history = await getInspectionHistory();
    const existingIndex = history.findIndex((i) => i.id === inspection.id);
    if (existingIndex >= 0) {
      history[existingIndex] = inspection;
    } else {
      history.unshift(inspection);
    }
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error saving to inspection history:", error);
  }
}
