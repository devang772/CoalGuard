import { UserRole } from '../lib/rbac';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  org_unit_id: string;
  mine_id: string | null;
  mine_name: string | null;
  language: string;
}

export interface Obligation {
  id: string;
  title: string;
  law_ref: string;
  category: string;
  evidence_needed: string;
}

export interface TaskItem {
  id: string;
  obligation: Obligation;
  due_date: string;
  status: 'pending' | 'done' | 'overdue';
  escalation_level: 'L0' | 'L1' | 'L2';
  completed_at?: string;
  evidence_id?: string;
  remarks?: string;
  trust_score?: number;
  trust_flags?: string[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  category: string;
}

export interface Checklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface CAPAItem {
  id: string;
  finding: {
    description: string;
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    lat: number;
    lng: number;
  };
  before_photo: {
    url: string;
    lat: number;
    lng: number;
  };
  after_photo?: {
    url: string;
    lat: number;
    lng: number;
  };
  due_at: string;
  status: 'open' | 'in_review' | 'closed' | 'rejected';
  escalation_level: 'Assigned' | 'L1' | 'L2';
  overdue: boolean;
  trust_score?: number;
  trust_flags?: string[];
}

export interface ObservationReport {
  id: string;
  mine_id: string;
  type: 'unsafe_act' | 'unsafe_condition' | 'near_miss' | 'incident';
  category: string;
  text: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  lat: number;
  lng: number;
  evidence_id?: string;
  source: 'app' | 'voice';
  language: string;
  created_at: string;
  trust_score?: number;
  trust_flags?: string[];
}

export interface VoiceReportResult {
  transcript: string;
  structured: {
    type: 'unsafe_act' | 'unsafe_condition' | 'near_miss' | 'incident';
    category: string;
    hazard: string;
    location_text: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  };
}

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  date: string;
  time: string;
  valid: boolean;
  reason?: string;
  selfie_url?: string;
  lat: number;
  lng: number;
}

export interface GrievanceItem {
  token: string;
  category: string;
  text: string;
  anonymous: boolean;
  status: 'new' | 'in_progress' | 'resolved';
  response?: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'escalation' | 'reminder' | 'approval' | 'rejection';
  timestamp: string;
  read: boolean;
  related_id?: string;
}
