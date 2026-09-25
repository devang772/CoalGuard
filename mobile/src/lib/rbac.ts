export type UserRole =
  | 'worker'
  | 'supervisor'
  | 'safety_officer'
  | 'mine_manager'
  | 'area_gm'
  | 'subsidiary_admin'
  | 'cil_admin'
  | 'regulator'
  | 'contractor_admin';

export interface TabConfig {
  name: string;
  title: string;
  icon: string;
  isCenterButton?: boolean;
}

export function getTabsForRole(role: UserRole): TabConfig[] {
  switch (role) {
    case 'safety_officer':
    case 'supervisor':
    case 'mine_manager':
      return [
        { name: 'home', title: 'Home', icon: 'home' },
        { name: 'tasks', title: 'Tasks', icon: 'clipboard-list' },
        { name: 'report', title: 'Report', icon: 'plus-circle', isCenterButton: true },
        { name: 'capa', title: 'CAPA', icon: 'shield-alert' },
        { name: 'more', title: 'More', icon: 'grid' },
      ];

    case 'worker':
      return [
        { name: 'home', title: 'Home', icon: 'home' },
        { name: 'report', title: 'Report', icon: 'plus-circle', isCenterButton: true },
        { name: 'attendance', title: 'Attendance', icon: 'user-check' },
        { name: 'grievance', title: 'Grievance', icon: 'message-square' },
        { name: 'more', title: 'More', icon: 'grid' },
      ];

    case 'contractor_admin':
      return [
        { name: 'home', title: 'Home', icon: 'home' },
        { name: 'attendance', title: 'Attendance', icon: 'user-check' },
        { name: 'workers', title: 'Workers', icon: 'users' },
        { name: 'more', title: 'More', icon: 'grid' },
      ];

    default:
      return [
        { name: 'home', title: 'Home', icon: 'home' },
        { name: 'report', title: 'Report', icon: 'plus-circle', isCenterButton: true },
        { name: 'more', title: 'More', icon: 'grid' },
      ];
  }
}

export function isOfficerRole(role?: UserRole): boolean {
  return role === 'safety_officer' || role === 'supervisor' || role === 'mine_manager';
}
