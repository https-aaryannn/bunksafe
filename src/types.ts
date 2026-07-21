export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'cancelled';
  hours: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  hoursAttended: number;
  hoursConducted: number;
  targetPercentage: number; // usually 75% for KTU
  lastUpdated: string;
  history: AttendanceRecord[];
  category?: 'core' | 'elective' | 'lab';
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  branch: string;
  semester: string;
  registerNumber: string;
  targetAttendance: number;
  avatarUrl?: string;
  isGuest?: boolean;
  lastSynced?: string;
}

export interface BunkSimulation {
  subjectId: string;
  simulatedBunks: number;
  simulatedAttends: number;
}

export interface BunkNote {
  id: string;
  date: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  hoursMissed: number;
  reason: 'Medical Leave' | 'Family Function' | 'Placement Drive' | 'Competition' | 'Personal' | 'Other';
  details?: string;
}
