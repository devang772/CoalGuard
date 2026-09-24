import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  Mine,
  InspectionData,
  ChecklistItem,
  PhotoItem,
  LocationData,
  Observation,
  SeverityLevel,
  ChecklistStatus,
} from "../types";
import { INITIAL_CHECKLIST, MOCK_MINES } from "../constants/mockData";
import { submitInspection } from "../services/inspection";
import { getPendingInspections, removePendingInspection } from "../services/offlineStorage";

interface InspectionContextType {
  selectedMine: Mine | null;
  checklist: ChecklistItem[];
  photos: PhotoItem[];
  location: LocationData | null;
  observations: Observation[];
  hazards: string[];
  severity: SeverityLevel;
  remarks: string;
  pendingCount: number;
  pendingList: InspectionData[];

  // Actions
  selectMine: (mine: Mine) => void;
  updateChecklistStatus: (id: string, status: ChecklistStatus, remarks?: string) => void;
  addPhoto: (photo: PhotoItem) => void;
  removePhoto: (id: string) => void;
  setLocationData: (loc: LocationData) => void;
  setSeverityLevel: (sev: SeverityLevel) => void;
  toggleHazard: (hazard: string) => void;
  setRemarksText: (text: string) => void;
  resetForm: () => void;
  submitInspectionForm: () => Promise<{ success: boolean; isOfflineSaved: boolean; message: string }>;
  syncPending: () => Promise<{ syncedCount: number; failedCount: number }>;
  refreshPendingCount: () => Promise<void>;
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

export function InspectionProvider({ children }: { children: ReactNode }) {
  const [selectedMine, setSelectedMine] = useState<Mine | null>(MOCK_MINES[0]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [hazards, setHazards] = useState<string[]>([]);
  const [severity, setSeverity] = useState<SeverityLevel>("LOW");
  const [remarks, setRemarks] = useState<string>("");
  const [pendingList, setPendingList] = useState<InspectionData[]>([]);

  const refreshPendingCount = async () => {
    const list = await getPendingInspections();
    setPendingList(list);
  };

  useEffect(() => {
    refreshPendingCount();
  }, []);

  const selectMine = (mine: Mine) => {
    setSelectedMine(mine);
  };

  const updateChecklistStatus = (id: string, status: ChecklistStatus, remarks?: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, ...(remarks !== undefined ? { remarks } : {}) } : item
      )
    );
  };

  const addPhoto = (photo: PhotoItem) => {
    setPhotos((prev) => [photo, ...prev]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const setLocationData = (loc: LocationData) => {
    setLocation(loc);
  };

  const setSeverityLevel = (sev: SeverityLevel) => {
    setSeverity(sev);
  };

  const toggleHazard = (hazard: string) => {
    setHazards((prev) =>
      prev.includes(hazard) ? prev.filter((h) => h !== hazard) : [...prev, hazard]
    );
  };

  const setRemarksText = (text: string) => {
    setRemarks(text);
  };

  const resetForm = () => {
    setChecklist(INITIAL_CHECKLIST);
    setPhotos([]);
    setLocation(null);
    setObservations([]);
    setHazards([]);
    setSeverity("LOW");
    setRemarks("");
  };

  const submitInspectionForm = async () => {
    const nonCompliantCount = checklist.filter((c) => c.status === "NON_COMPLIANT").length;
    const computedScore = Math.max(0, 100 - nonCompliantCount * 18 - hazards.length * 10);
    const computedStatus = computedScore >= 75 && severity !== "CRITICAL" ? "PASSED" : "FAILED";

    const newInspection: InspectionData = {
      id: `insp-${Date.now()}`,
      mineId: selectedMine?.id || "mine-jharia-04",
      mineName: selectedMine?.name || "Jharia Block 4 Open Pit",
      inspectorId: "usr-tech-102",
      inspectorName: "Inspector Amit Sharma",
      date: new Date().toISOString(),
      status: computedStatus,
      hazardScore: 100 - computedScore,
      location,
      checklist,
      observations,
      hazards,
      severity,
      remarks: remarks || "Field inspection completed.",
      photos,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    const res = await submitInspection(newInspection);
    await refreshPendingCount();
    resetForm();
    return res;
  };

  const syncPending = async () => {
    const pending = await getPendingInspections();
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of pending) {
      const res = await submitInspection(item);
      if (res.success && !res.isOfflineSaved) {
        await removePendingInspection(item.id);
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    await refreshPendingCount();
    return { syncedCount, failedCount };
  };

  return (
    <InspectionContext.Provider
      value={{
        selectedMine,
        checklist,
        photos,
        location,
        observations,
        hazards,
        severity,
        remarks,
        pendingCount: pendingList.length,
        pendingList,

        selectMine,
        updateChecklistStatus,
        addPhoto,
        removePhoto,
        setLocationData,
        setSeverityLevel,
        toggleHazard,
        setRemarksText,
        resetForm,
        submitInspectionForm,
        syncPending,
        refreshPendingCount,
      }}
    >
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspection() {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error("useInspection must be used within an InspectionProvider");
  }
  return context;
}
