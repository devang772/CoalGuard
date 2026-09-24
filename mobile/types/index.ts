export type InspectionStatus = 'PASSED' | 'FAILED' | 'IN_PROGRESS' | 'PENDING_SYNC';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ChecklistStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';

export interface Mine {
  id: string;
  name: string;
  code: string;
  location: string;
  latitude: number;
  longitude: number;
  status: 'ACTIVE' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE';
  safetyScore: number;
  riskIndex: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  activeWorkers: number;
  dgmsZone: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
}

export interface PhotoItem {
  id: string;
  uri: string;
  fileName: string;
  timestamp: string;
  caption?: string;
  hazardTag?: string;
  location?: LocationData;
}

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  dgmsClause: string;
  status: ChecklistStatus;
  remarks?: string;
}

export interface Observation {
  id: string;
  category: string;
  title: string;
  description: string;
  hazardDetected: boolean;
  severity: SeverityLevel;
  photoIds: string[];
}

export interface InspectionData {
  id: string;
  mineId: string;
  mineName: string;
  inspectorId: string;
  inspectorName: string;
  date: string;
  status: InspectionStatus;
  hazardScore: number;
  location: LocationData | null;
  checklist: ChecklistItem[];
  observations: Observation[];
  hazards: string[];
  severity: SeverityLevel;
  remarks: string;
  photos: PhotoItem[];
  createdAt: string;
  synced: boolean;
  syncAttempts?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'MINE_MANAGER' | 'SAFETY_INSPECTOR' | 'DGMS_AUDITOR' | 'FIELD_TECH';
  assignedMineId: string;
  avatarUrl?: string;
}

export interface AlertItem {
  id: string;
  mineId: string;
  mineName: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}
