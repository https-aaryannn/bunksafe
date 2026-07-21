import { Subject } from '../types';

/**
 * Calculates the current attendance percentage for a subject.
 */
export function calculatePercentage(attended: number, conducted: number): number {
  if (conducted === 0) return 100;
  return Number(((attended / conducted) * 100).toFixed(1));
}

/**
 * Calculates how many consecutive classes a student can bunk while staying safe (at or above target).
 * Formula: Math.floor(Attended / target - Conducted)
 */
export function calculateSafeBunks(attended: number, conducted: number, target: number = 75): number {
  const targetFraction = target / 100;
  if (conducted === 0) return 0;
  
  // Current percentage is already below target, cannot bunk
  if (attended / conducted < targetFraction) return 0;
  
  const maxConducted = attended / targetFraction;
  const safeBunks = Math.floor(maxConducted - conducted);
  return Math.max(0, safeBunks);
}

/**
 * Calculates how many consecutive classes a student must attend to reach the target attendance.
 * Formula: Math.ceil((target * Conducted - Attended) / (1 - target))
 */
export function calculateClassesToAttend(attended: number, conducted: number, target: number = 75): number {
  const targetFraction = target / 100;
  if (conducted === 0 || (attended / conducted) >= targetFraction) return 0;
  
  const required = Math.ceil((targetFraction * conducted - attended) / (1 - targetFraction));
  return Math.max(0, required);
}

/**
 * Determines the status tier of the attendance
 */
export function getAttendanceStatus(percentage: number, target: number = 75): 'safe' | 'warning' | 'danger' {
  if (percentage >= target + 5) return 'safe';
  if (percentage >= target) return 'warning';
  return 'danger';
}

/**
 * Returns a student-friendly KTU bunk status text
 */
export function getStatusMessage(subject: Subject): { message: string; subtext: string; color: string } {
  const percentage = calculatePercentage(subject.hoursAttended, subject.hoursConducted);
  const target = subject.targetPercentage;
  
  if (percentage >= target) {
    const safeBunks = calculateSafeBunks(subject.hoursAttended, subject.hoursConducted, target);
    if (safeBunks > 0) {
      return {
        message: `Safe to bunk ${safeBunks} class${safeBunks > 1 ? 'es' : ''}`,
        subtext: `Next bunk will lower percentage to ${calculatePercentage(subject.hoursAttended, subject.hoursConducted + 1)}%`,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      };
    } else {
      return {
        message: 'Borderline Safe',
        subtext: 'Bunking any class now will drop you below 75%',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      };
    }
  } else {
    const required = calculateClassesToAttend(subject.hoursAttended, subject.hoursConducted, target);
    return {
      message: `Must attend next ${required} class${required > 1 ? 'es' : ''}`,
      subtext: `Attending ${required} more classes will restore you to 75.0%`,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    };
  }
}
