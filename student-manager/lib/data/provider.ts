import type { ImportSummary, ParsedSheet } from '@/lib/import/types';
import type {
    AppUser,
    AttendedStatus,
    Course,
    Enrollment,
    RosterEntry,
    Student,
    StudentSummary,
} from '@/lib/types';

export interface CourseQuery {
    query?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    limit?: number;
}

export interface StudentQuery {
    query?: string;
    limit?: number;
}

export interface Overview {
    students: number;
    courses: number;
    enrollments: number;
    sessions: number;
    statusTotals: Record<AttendedStatus, number>;
    /** Most recently finished courses, newest first. */
    recentCourses: Course[];
}

export interface DataProvider {
    readonly kind: 'mock' | 'supabase';

    listCourses(query: CourseQuery): Promise<Course[]>;
    getCourse(id: number): Promise<Course | null>;
    getCourseRoster(id: number): Promise<RosterEntry[]>;

    listStudents(query: StudentQuery): Promise<Student[]>;
    listStudentSummaries(query: StudentQuery): Promise<StudentSummary[]>;
    getStudent(id: number): Promise<Student | null>;
    getStudentEnrollments(id: number): Promise<Enrollment[]>;
    mergeStudents(keepId: number, absorbId: number): Promise<void>;

    listUsers(): Promise<AppUser[]>;
    getUser(id: string): Promise<AppUser | null>;
    setUserFlags(
        id: string,
        patch: Partial<Pick<AppUser, 'approved' | 'admin'>>,
    ): Promise<void>;

    getOverview(): Promise<Overview>;

    importSheet(sheet: ParsedSheet): Promise<ImportSummary>;
}
