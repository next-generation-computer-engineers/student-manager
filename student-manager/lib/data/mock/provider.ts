import type { ImportSummary, ParsedSheet } from '@/lib/import/types';
import { hasCengStaffEmail } from '@/lib/import/normalize';
import type {
    AppUser,
    AttendedStatus,
    Course,
    Enrollment,
    RosterEntry,
    Student,
    StudentSummary,
} from '@/lib/types';

import type {
    CourseQuery,
    DataProvider,
    Overview,
    StudentQuery,
} from '../provider';
import { commit, getStore, nextId } from './store';

function matches(haystack: string, needle: string): boolean {
    if (!needle) return true;
    return haystack.toLowerCase().includes(needle.toLowerCase());
}

function isStudentRecord(student: Student): boolean {
    return !hasCengStaffEmail(student.parent_emails);
}

function normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function union(a: string[], b: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of [...a, ...b]) {
        const key = value.trim().toLowerCase();
        if (key === '' || seen.has(key)) continue;
        seen.add(key);
        out.push(value.trim());
    }
    return out;
}

/** Simulates a little network latency so loading states are exercised in dev. */
async function tick<T>(value: T): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return value;
}

export class MockProvider implements DataProvider {
    readonly kind = 'mock' as const;

    async listCourses(query: CourseQuery): Promise<Course[]> {
        const { classes } = getStore();
        const limit = query.limit ?? 10;

        const filtered = classes
            .filter((course) => matches(course.name, query.query ?? ''))
            .filter((course) => {
                if (query.startDate && course.start_date) {
                    if (new Date(course.start_date) < query.startDate) {
                        return false;
                    }
                }
                if (query.endDate && course.end_date) {
                    if (new Date(course.end_date) > query.endDate) return false;
                }
                return true;
            })
            .sort((a, b) =>
                (b.start_date ?? '').localeCompare(a.start_date ?? ''),
            )
            .slice(0, limit);

        return tick(filtered);
    }

    async getCourse(id: number): Promise<Course | null> {
        const course = getStore().classes.find((c) => c.id === id) ?? null;
        return tick(course);
    }

    async getCourseRoster(id: number): Promise<RosterEntry[]> {
        const { attendance, students } = getStore();
        const byId = new Map(students.map((s) => [s.id, s]));

        const roster = attendance
            .filter((row) => row.class_id === id)
            .map((row) => {
                const student = byId.get(row.student_id);
                if (!student) return null;
                return {
                    student: {
                        id: student.id,
                        name: student.name,
                        grade: student.grade,
                    },
                    level: row.level,
                    attended_statuses: row.attended_statuses,
                } satisfies RosterEntry;
            })
            .filter((row): row is RosterEntry => row !== null)
            .sort((a, b) => a.student.name.localeCompare(b.student.name));

        return tick(roster);
    }

    async listStudents(query: StudentQuery): Promise<Student[]> {
        const { students } = getStore();
        const limit = query.limit ?? 10;

        const filtered = students
            .filter(isStudentRecord)
            .filter(
                (student) =>
                    matches(student.name, query.query ?? '') ||
                    student.parent_emails.some((e) =>
                        matches(e, query.query ?? ''),
                    ) ||
                    student.parent_cells.some((c) =>
                        matches(c, query.query ?? ''),
                    ),
            )
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, limit);

        return tick(filtered);
    }

    async listStudentSummaries(query: StudentQuery): Promise<StudentSummary[]> {
        const students = await this.listStudents(query);
        const { attendance, classes } = getStore();
        const courseById = new Map(classes.map((c) => [c.id, c]));

        return students.map((student) => {
            const dates = attendance
                .filter((row) => row.student_id === student.id)
                .flatMap((row) => courseById.get(row.class_id)?.dates ?? [])
                .filter(Boolean)
                .sort();

            return {
                ...student,
                courseCount: attendance.filter(
                    (row) => row.student_id === student.id,
                ).length,
                firstDate: dates[0] ?? null,
                lastDate: dates[dates.length - 1] ?? null,
            };
        });
    }

    async getStudent(id: number): Promise<Student | null> {
        const student = getStore().students.find((s) => s.id === id) ?? null;
        return tick(student);
    }

    async getStudentEnrollments(id: number): Promise<Enrollment[]> {
        const { attendance, classes } = getStore();
        const byId = new Map(classes.map((c) => [c.id, c]));

        const enrollments = attendance
            .filter((row) => row.student_id === id)
            .map((row) => {
                const course = byId.get(row.class_id);
                if (!course) return null;
                return {
                    id: row.id,
                    course: {
                        id: course.id,
                        name: course.name,
                        dates: course.dates,
                    },
                    level: row.level,
                    attended_statuses: row.attended_statuses,
                } satisfies Enrollment;
            })
            .filter((row): row is Enrollment => row !== null)
            .sort((a, b) =>
                (b.course.dates[0] ?? '').localeCompare(a.course.dates[0] ?? ''),
            );

        return tick(enrollments);
    }

    async mergeStudents(keepId: number, absorbId: number): Promise<void> {
        const store = getStore();
        const keep = store.students.find((s) => s.id === keepId);
        const absorb = store.students.find((s) => s.id === absorbId);
        if (!keep || !absorb || keepId === absorbId) return;

        keep.parent_cells = union(keep.parent_cells, absorb.parent_cells);
        keep.parent_emails = union(keep.parent_emails, absorb.parent_emails);
        if (keep.grade === null) keep.grade = absorb.grade;

        for (const row of store.attendance) {
            if (row.student_id === absorbId) row.student_id = keepId;
        }

        // Drop rows that now duplicate an enrollment the kept student had.
        const seen = new Set<string>();
        store.attendance = store.attendance.filter((row) => {
            const key = `${row.student_id}:${row.class_id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        store.students = store.students.filter((s) => s.id !== absorbId);
        commit();
    }

    async listUsers(): Promise<AppUser[]> {
        const users = [...getStore().users].sort((a, b) =>
            b.created_at.localeCompare(a.created_at),
        );
        return tick(users);
    }

    async setUserFlags(
        id: string,
        patch: Partial<Pick<AppUser, 'approved' | 'admin'>>,
    ): Promise<void> {
        const store = getStore();
        const user = store.users.find((u) => u.id === id);
        if (!user) return;
        if (patch.approved !== undefined) user.approved = patch.approved;
        if (patch.admin !== undefined) user.admin = patch.admin;
        commit();
    }

    async getOverview(): Promise<Overview> {
        const { students, classes, attendance } = getStore();

        const statusTotals: Record<AttendedStatus, number> = {
            present: 0,
            late: 0,
            absent: 0,
            excused: 0,
        };
        let sessions = 0;
        for (const row of attendance) {
            for (const status of row.attended_statuses) {
                statusTotals[status] += 1;
                sessions += 1;
            }
        }

        const recentCourses = [...classes]
            .sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? ''))
            .slice(0, 5);

        return tick({
            students: students.length,
            courses: classes.length,
            enrollments: attendance.length,
            sessions,
            statusTotals,
            recentCourses,
        });
    }

    async importSheet(sheet: ParsedSheet): Promise<ImportSummary> {
        const store = getStore();

        const dates = sheet.dates.filter((d) => d !== '');
        const sorted = [...dates].sort();

        const course: Course = {
            id: nextId(store.classes),
            name: sheet.courseName,
            dates: sheet.dates,
            start_date: sorted[0] ?? null,
            end_date: sorted[sorted.length - 1] ?? null,
        };
        store.classes.push(course);

        const byName = new Map(
            store.students.map((s) => [normalizeName(s.name), s]),
        );

        let studentsCreated = 0;
        let studentsMatched = 0;
        let attendanceRows = 0;

        for (const row of sheet.students) {
            const key = normalizeName(row.name);
            let student = byName.get(key);

            if (student) {
                studentsMatched += 1;
                student.parent_cells = union(
                    student.parent_cells,
                    row.parent_cells,
                );
                student.parent_emails = union(
                    student.parent_emails,
                    row.parent_emails,
                );
                if (student.grade === null && row.grade !== null) {
                    student.grade = row.grade;
                }
            } else {
                student = {
                    id: nextId(store.students),
                    name: row.name,
                    grade: row.grade,
                    parent_cells: row.parent_cells,
                    parent_emails: row.parent_emails,
                };
                store.students.push(student);
                byName.set(key, student);
                studentsCreated += 1;
            }

            store.attendance.push({
                id: nextId(store.attendance),
                student_id: student.id,
                class_id: course.id,
                level: row.level,
                attended_statuses: row.attended_statuses,
            });
            attendanceRows += 1;
        }

        commit();

        return {
            courseId: course.id,
            courseName: course.name,
            studentsCreated,
            studentsMatched,
            attendanceRows,
        };
    }
}
