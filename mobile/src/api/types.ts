import { UserRole } from '../lib/rbac';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  org_unit_id: string;
  org_name?: string | null;
  org_type?: string | null;
  mine_id: string | null;
  mine_name: string | null;
  language: string;
}

/** Photo proof as returned by the API (`url` is already absolute here). */
export interface EvidenceInfo {
  id: number;
  url?: string;
  lat: number | null;
  lng: number | null;
  trust_score: number | null;
  trust_level: string | null;
  flags: string[];
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
  mine_name: string;
  obligation: Obligation;
  due_date: string;
  status: 'pending' | 'done' | 'overdue';
  escalation_level: 'L0' | 'L1' | 'L2' | 'L3';
  completed_at?: string;
  done_by_name?: string;
  evidence_id?: string;
  evidence?: EvidenceInfo | null;
  remarks?: string;
  trust_score?: number;
  trust_flags?: string[];
}

export interface TaskSummary {
  due_today: number;
  due_this_week: number;
  overdue: number;
  done_today: number;
  pending: number;
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

export interface ClosureCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface CAPAItem {
  id: string;
  mine_name: string;
  owner_name?: string;
  finding: {
    description: string;
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    law_ref?: string | null;
    lat: number | null;
    lng: number | null;
  };
  before_photo: {
    url: string;
    lat: number | null;
    lng: number | null;
  };
  after_photo?: {
    url: string;
    lat: number | null;
    lng: number | null;
  };
  due_at: string;
  status: 'open' | 'in_review' | 'closed' | 'rejected';
  escalation_level: 'Assigned' | 'L1' | 'L2' | 'L3';
  escalation_step: number;
  overdue: boolean;
  closure_checks?: ClosureCheck[] | null;
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
  mine_name: string;
  date: string;
  time: string;
  valid: boolean;
  reason?: string;
  selfie_url?: string;
  lat: number | null;
  lng: number | null;
}

export interface GrievanceItem {
  token: string;
  category: string;
  text: string;
  anonymous: boolean;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  response?: string;
  created_at: string;
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

export interface MyReportItem {
  id: string;
  kind: string;
  title: string;
  status: string;
  created_at: string;
  trust_score: number | null;
  flags: string[];
}

export interface MapPin {
  id: string;
  type: 'finding' | 'observation' | 'incident' | 'sos';
  title: string;
  severity: string;
  lat: number;
  lng: number;
}

export interface InspectionFinding {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  has_photo: boolean;
  checklist_item_id: string | null;
  capa_id: number | null;
}

export interface InspectionDetail {
  id: string;
  mine_id: number;
  mine_name: string;
  type: string;
  status: 'in_progress' | 'submitted';
  checklist_id: number | null;
  started_at: string;
  submitted_at: string | null;
  checklist_answers: { item_id: string; answer: 'ok' | 'not_ok' | 'na' }[] | null;
  findings: InspectionFinding[];
}

/** Result of a write that may have been queued for later because the phone is offline. */
export interface SubmitResult<T> {
  queued: boolean;
  data?: T;
  evidence?: EvidenceInfo | null;
}
