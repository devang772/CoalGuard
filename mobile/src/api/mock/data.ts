import { TaskItem, Checklist, CAPAItem, NotificationItem, AttendanceRecord, GrievanceItem } from '../types';

export const MOCK_TASKS: TaskItem[] = [
  {
    id: 'task-101',
    obligation: {
      id: 'obl-1',
      title: 'Inspect Underground Gas & Methane Monitoring System',
      law_ref: 'CMR 2017 Regulation 153(2)',
      category: 'gas_monitoring',
      evidence_needed: 'Photo of digital methanometer reading at Seam 3 face + signed logbook entry.',
    },
    due_date: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    status: 'pending',
    escalation_level: 'L0',
  },
  {
    id: 'task-102',
    obligation: {
      id: 'obl-2',
      title: 'Haul Road Dust Suppression & Water Sprinkling Check',
      law_ref: 'DGMS Safety Circular 2022/04',
      category: 'haul_road',
      evidence_needed: 'Photo of operational water tanker spraying haul road section 4.',
    },
    due_date: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    status: 'pending',
    escalation_level: 'L0',
  },
  {
    id: 'task-103',
    obligation: {
      id: 'obl-3',
      title: 'Conveyor Emergency Pull-Cord Switch Verification',
      law_ref: 'CMR 2017 Regulation 92',
      category: 'conveyor',
      evidence_needed: 'Photo showing pull-cord switch tension & trip test mechanism.',
    },
    due_date: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    status: 'overdue',
    escalation_level: 'L1',
  },
  {
    id: 'task-104',
    obligation: {
      id: 'obl-4',
      title: 'Underground Roof Support & Timbering Pillar Audit',
      law_ref: 'CMR 2017 Regulation 123',
      category: 'roof_support',
      evidence_needed: 'Clear photo of hydraulic prop pressure gauge indicating >200 bar.',
    },
    due_date: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    status: 'overdue',
    escalation_level: 'L2',
  },
  {
    id: 'task-105',
    obligation: {
      id: 'obl-5',
      title: 'Electrical Substation Earth Pit Resistance Test',
      law_ref: 'CEA Regulations 2010',
      category: 'electrical',
      evidence_needed: 'Photo of Earth Megger meter reading showing <2 ohms.',
    },
    due_date: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    status: 'pending',
    escalation_level: 'L0',
  },
  {
    id: 'task-106',
    obligation: {
      id: 'obl-6',
      title: 'Worker Self-Rescuer Apparatus Breathing Bag Check',
      law_ref: 'DGMS Tech Circular 08/2021',
      category: 'ppe',
      evidence_needed: 'Photo of seals intact on Self-Rescuer apparatus pack.',
    },
    due_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: 'pending',
    escalation_level: 'L0',
  },
  {
    id: 'task-107',
    obligation: {
      id: 'obl-7',
      title: 'Open-cast Slope Stability Indicator Gauge Reading',
      law_ref: 'CMR 2017 Regulation 106',
      category: 'slope',
      evidence_needed: 'Photo of slope prism target & station mark.',
    },
    due_date: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    status: 'done',
    completed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    escalation_level: 'L0',
    trust_score: 92,
    trust_flags: [],
  },
  {
    id: 'task-108',
    obligation: {
      id: 'obl-8',
      title: 'Blasting Shelter Distance & Audibility Test',
      law_ref: 'CMR 2017 Regulation 164',
      category: 'explosives',
      evidence_needed: 'Photo of siren control console & warning signal display.',
    },
    due_date: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    status: 'done',
    completed_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    escalation_level: 'L0',
    trust_score: 88,
    trust_flags: [],
  },
];

export const MOCK_CHECKLISTS: Checklist[] = [
  {
    id: 'chk-1',
    name: 'Daily Haul Road Safety Checklist',
    items: [
      { id: 'chk-1-1', text: 'Road berm height equal to largest dump truck tyre diameter (min 1.5m)', category: 'haul_road' },
      { id: 'chk-1-2', text: 'Dust suppression water sprinkler operational without clogging', category: 'haul_road' },
      { id: 'chk-1-3', text: 'Catch bunds intact on sharp turns and gradient slopes', category: 'haul_road' },
      { id: 'chk-1-4', text: 'Illumination levels at haul road junctions >15 lux', category: 'haul_road' },
      { id: 'chk-1-5', text: 'Speed limit signs clearly visible and unobstructed by dust', category: 'haul_road' },
    ],
  },
  {
    id: 'chk-2',
    name: 'Underground Roof Support & Face Inspection',
    items: [
      { id: 'chk-2-1', text: 'No visible spalling or cracks on roof strata in Seam 3 face', category: 'roof_support' },
      { id: 'chk-2-2', text: 'Tell-Tale roof convergence indicators showing <5mm movement', category: 'roof_support' },
      { id: 'chk-2-3', text: 'Hydraulic props pressurized to minimum 200 bar operating limit', category: 'roof_support' },
      { id: 'chk-2-4', text: 'Cross-bars and wooden chocks securely set without slippage', category: 'roof_support' },
      { id: 'chk-2-5', text: 'Auxiliary ventilation ducting extending within 3m of working face', category: 'ventilation' },
    ],
  },
  {
    id: 'chk-3',
    name: 'Conveyor Belt System Safety Audit',
    items: [
      { id: 'chk-3-1', text: 'Pull-cord switches working along entire length of belt line', category: 'conveyor' },
      { id: 'chk-3-2', text: 'Sequence control switches functional between transfer points', category: 'conveyor' },
      { id: 'chk-3-3', text: 'No accumulation of coal dust beneath return idlers', category: 'conveyor' },
      { id: 'chk-3-4', text: 'Fire warning sensors & water deluge nozzles clear of debris', category: 'fire' },
    ],
  },
];

export const MOCK_CAPAS: CAPAItem[] = [
  {
    id: 'capa-201',
    finding: {
      description: 'Roof crack visible near Conveyor 3 transfer point with loose stone fragments.',
      category: 'roof_support',
      severity: 'critical',
      lat: 23.7505,
      lng: 86.4205,
    },
    before_photo: {
      url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600',
      lat: 23.7505,
      lng: 86.4205,
    },
    due_at: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    status: 'open',
    escalation_level: 'Assigned',
    overdue: false,
  },
  {
    id: 'capa-202',
    finding: {
      description: 'Unguarded drive pulley on Main Slope Conveyor Belt line.',
      category: 'conveyor',
      severity: 'high',
      lat: 23.7512,
      lng: 86.4215,
    },
    before_photo: {
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600',
      lat: 23.7512,
      lng: 86.4215,
    },
    due_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    status: 'open',
    escalation_level: 'L2',
    overdue: true,
  },
  {
    id: 'capa-203',
    finding: {
      description: 'Damaged electrical cable insulation near Substation 2 junction box.',
      category: 'electrical',
      severity: 'high',
      lat: 23.7495,
      lng: 86.4190,
    },
    before_photo: {
      url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=600',
      lat: 23.7495,
      lng: 86.4190,
    },
    due_at: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
    status: 'in_review',
    escalation_level: 'Assigned',
    overdue: false,
    trust_score: 86,
  },
  {
    id: 'capa-204',
    finding: {
      description: 'Clogged drainage channel along South Haul Road causing waterlogging.',
      category: 'drainage',
      severity: 'medium',
      lat: 23.7480,
      lng: 86.4230,
    },
    before_photo: {
      url: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600',
      lat: 23.7480,
      lng: 86.4230,
    },
    due_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    status: 'closed',
    escalation_level: 'Assigned',
    overdue: false,
    trust_score: 94,
  },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'CAPA Escalation L2',
    message: 'CAPA #capa-202 (Unguarded drive pulley) escalated to Area GM due to 36h delay.',
    type: 'escalation',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: false,
    related_id: 'capa-202',
  },
  {
    id: 'notif-2',
    title: 'Task Due Reminder',
    message: 'Gas Monitoring Inspection (CMR Reg 153) is due in 3 hours.',
    type: 'reminder',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    read: true,
    related_id: 'task-101',
  },
  {
    id: 'notif-3',
    title: 'CAPA Closure Approved',
    message: 'Your CAPA closure for South Haul Road drainage was verified with Trust Score 94.',
    type: 'approval',
    timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    read: true,
    related_id: 'capa-204',
  },
];

export const MOCK_WORKERS = [
  { id: 'w-1', name: 'Manoj Kumar', contractor_name: 'BCCL Operations' },
  { id: 'w-2', name: 'Rajesh Bauri', contractor_name: 'MCL Excavations' },
  { id: 'w-3', name: 'Dharmendra Mahato', contractor_name: 'BCCL Operations' },
  { id: 'w-4', name: 'Sunil Hansda', contractor_name: 'Eastern Mining Corp' },
  { id: 'w-5', name: 'Bikash Murmu', contractor_name: 'BCCL Operations' },
];
