export type AttendedStatus = 'present' | 'late' | 'absent' | 'excused';

export const ATTENDED_STATUSES: AttendedStatus[] = [
    'present',
    'late',
    'excused',
    'absent',
];

export type Level = 'beginner' | 'intermediate' | 'advanced';

export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export interface Student {
    id: number;
    name: string;
    grade: number | null;
    parent_cells: string[];
    parent_emails: string[];
}

export interface Course {
    id: number;
    name: string;
    dates: string[];
    start_date: string | null;
    end_date: string | null;
}

export interface AttendanceRecord {
    id: number;
    student_id: number;
    class_id: number;
    level: Level | null;
    attended_statuses: AttendedStatus[];
}

/** A student plus the activity summary shown in list views. */
export interface StudentSummary extends Student {
    courseCount: number;
    firstDate: string | null;
    lastDate: string | null;
}

/** A course roster row: one student plus their attendance in that course. */
export interface RosterEntry {
    student: Pick<Student, 'id' | 'name' | 'grade'>;
    level: Level | null;
    attended_statuses: AttendedStatus[];
}

/** A student's enrollment: one course plus their attendance in it. */
export interface Enrollment {
    id: number;
    course: Pick<Course, 'id' | 'name' | 'dates'>;
    level: Level | null;
    attended_statuses: AttendedStatus[];
}

export interface AppUser {
    id: string;
    email: string;
    approved: boolean;
    admin: boolean;
    created_at: string;
}

export interface AuthUser {
    id: string;
    email: string;
}

export type AttendanceTally = Record<AttendedStatus, number>;

export function tally(statuses: AttendedStatus[]): AttendanceTally {
    const counts: AttendanceTally = {
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
    };
    for (const status of statuses) counts[status] += 1;
    return counts;
}

/**
 * Share of sessions the student showed up for. Late still counts as attending;
 * excused is removed from the denominator rather than counted against them.
 */
export function attendanceRate(statuses: AttendedStatus[]): number | null {
    const counts = tally(statuses);
    const graded = counts.present + counts.late + counts.absent;
    if (graded === 0) return null;
    return (counts.present + counts.late) / graded;
}
