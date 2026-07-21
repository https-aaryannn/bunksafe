import { Subject, UserProfile } from './types';

export const DEFAULT_USER: UserProfile = {
  name: "Demo Scholar",
  email: "demo.scholar.cse23@cet.ac.in",
  branch: "Computer Science & Engineering",
  semester: "Semester 6",
  registerNumber: "TVE21CS042",
  targetAttendance: 75,
  avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=scholar"
};

export const INITIAL_SUBJECTS: Subject[] = [];
