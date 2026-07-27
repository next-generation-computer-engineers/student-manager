import { createClient } from '@/lib/supabase/server';
import { hasCengStaffEmail } from '@/lib/import/normalize';
import type { ImportSummary, ParsedSheet } from '@/lib/import/types';
import type {
    AppUser,
    AttendedStatus,
    Course,
    Enrollment,
    Level,
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

const STUDENT_COLUMNS = 'id, name, grade, parent_cells, parent_emails';
const COURSE_COLUMNS = 'id, name, dates, start_date, end_date';

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

export class SupabaseProvider implements DataProvider {
    readonly kind = 'supabase' as const;

    async listCourses(query: CourseQuery): Promise<Course[]> {
        const client = await createClient();
        let builder = client
            .from('classes')
            .select(COURSE_COLUMNS)
            .ilike('name', `%${query.query ?? ''}%`);

        if (query.startDate) {
            builder = builder.gte('start_date', query.startDate.toISOString());
        }
        if (query.endDate) {
            builder = builder.lte('end_date', query.endDate.toISOString());
        }

        const { data, error } = await builder
            .order('start_date', { ascending: false })
            .limit(query.limit ?? 10);

        if (error) throw new Error(error.message);
        return (data ?? []) as Course[];
    }

    async getCourse(id: number): Promise<Course | null> {
        const client = await createClient();
        const { data, error } = await client
            .from('classes')
            .select(COURSE_COLUMNS)
            .eq('id', id)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return (data as Course) ?? null;
    }

    async getCourseRoster(id: number): Promise<RosterEntry[]> {
        const client = await createClient();
        const { data, error } = await client
            .from('attendance')
            .select('students(id, name, grade), level, attended_statuses')
            .eq('class_id', id);

        if (error) throw new Error(error.message);

        type Row = {
            students: { id: number; name: string; grade: number | null } | null;
            level: Level | null;
            attended_statuses: AttendedStatus[] | null;
        };

        return ((data ?? []) as unknown as Row[])
            .filter((row) => row.students !== null)
            .map((row) => ({
                student: row.students!,
                level: row.level,
                attended_statuses: row.attended_statuses ?? [],
            }))
            .sort((a, b) => a.student.name.localeCompare(b.student.name));
    }

    async listStudents(query: StudentQuery): Promise<Student[]> {
        const client = await createClient();
        const term = query.query ?? '';

        let builder = client.from('students').select(STUDENT_COLUMNS);
        if (term !== '') {
            // Match the name column or either contact array.
            builder = builder.or(
                `name.ilike.%${term}%,parent_emails.cs.{${term}},parent_cells.cs.{${term}}`,
            );
        }

        const { data, error } = await builder
            .order('name', { ascending: true })
            .limit(query.limit ?? 10);

        if (error) throw new Error(error.message);
        return ((data ?? []) as Student[]).filter(
            (student) => !hasCengStaffEmail(student.parent_emails),
        );
    }

    async listStudentSummaries(query: StudentQuery): Promise<StudentSummary[]> {
        const students = await this.listStudents(query);
        if (students.length === 0) return [];

        const client = await createClient();
        const { data, error } = await client
            .from('attendance')
            .select('student_id, classes(dates)')
            .in(
                'student_id',
                students.map((s) => s.id),
            );

        if (error) throw new Error(error.message);

        type Row = {
            student_id: number;
            classes: { dates: string[] } | null;
        };

        const byStudent = new Map<number, string[]>();
        const counts = new Map<number, number>();
        for (const row of (data ?? []) as unknown as Row[]) {
            counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1);
            const dates = byStudent.get(row.student_id) ?? [];
            dates.push(...(row.classes?.dates ?? []));
            byStudent.set(row.student_id, dates);
        }

        return students.map((student) => {
            const dates = (byStudent.get(student.id) ?? [])
                .filter(Boolean)
                .sort();
            return {
                ...student,
                courseCount: counts.get(student.id) ?? 0,
                firstDate: dates[0] ?? null,
                lastDate: dates[dates.length - 1] ?? null,
            };
        });
    }

    async getStudent(id: number): Promise<Student | null> {
        const client = await createClient();
        const { data, error } = await client
            .from('students')
            .select(STUDENT_COLUMNS)
            .eq('id', id)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return (data as Student) ?? null;
    }

    async getStudentEnrollments(id: number): Promise<Enrollment[]> {
        const client = await createClient();
        const { data, error } = await client
            .from('attendance')
            .select('id, classes(id, name, dates), level, attended_statuses')
            .eq('student_id', id);

        if (error) throw new Error(error.message);

        type Row = {
            id: number;
            classes: { id: number; name: string; dates: string[] } | null;
            level: Level | null;
            attended_statuses: AttendedStatus[] | null;
        };

        return ((data ?? []) as unknown as Row[])
            .filter((row) => row.classes !== null)
            .map((row) => ({
                id: row.id,
                course: row.classes!,
                level: row.level,
                attended_statuses: row.attended_statuses ?? [],
            }))
            .sort((a, b) =>
                (b.course.dates[0] ?? '').localeCompare(a.course.dates[0] ?? ''),
            );
    }

    async mergeStudents(keepId: number, absorbId: number): Promise<void> {
        const client = await createClient();
        const { error } = await client.rpc('merge_users', {
            student1: keepId,
            student2: absorbId,
        });
        if (error) throw new Error(error.message);
    }

    async listUsers(): Promise<AppUser[]> {
        const client = await createClient();
        const { data, error } = await client
            .from('users')
            .select('id, created_at, email, approved, admin')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return (data ?? []) as AppUser[];
    }

    async setUserFlags(
        id: string,
        patch: Partial<Pick<AppUser, 'approved' | 'admin'>>,
    ): Promise<void> {
        const client = await createClient();
        const { error } = await client.from('users').update(patch).eq('id', id);
        if (error) throw new Error(error.message);
    }

    async getOverview(): Promise<Overview> {
        const client = await createClient();

        const [studentCount, courseCount, attendanceRows, recent] =
            await Promise.all([
                client
                    .from('students')
                    .select('id', { count: 'exact', head: true }),
                client
                    .from('classes')
                    .select('id', { count: 'exact', head: true }),
                client.from('attendance').select('attended_statuses'),
                client
                    .from('classes')
                    .select(COURSE_COLUMNS)
                    .order('end_date', { ascending: false })
                    .limit(5),
            ]);

        const statusTotals: Record<AttendedStatus, number> = {
            present: 0,
            late: 0,
            absent: 0,
            excused: 0,
        };
        let sessions = 0;

        const rows = (attendanceRows.data ?? []) as {
            attended_statuses: AttendedStatus[] | null;
        }[];
        for (const row of rows) {
            for (const status of row.attended_statuses ?? []) {
                statusTotals[status] += 1;
                sessions += 1;
            }
        }

        return {
            students: studentCount.count ?? 0,
            courses: courseCount.count ?? 0,
            enrollments: rows.length,
            sessions,
            statusTotals,
            recentCourses: (recent.data ?? []) as Course[],
        };
    }

    async importSheet(sheet: ParsedSheet): Promise<ImportSummary> {
        const client = await createClient();

        const dates = sheet.dates.filter((d) => d !== '');
        const sorted = [...dates].sort();

        const { data: course, error: courseError } = await client
            .from('classes')
            .insert({
                name: sheet.courseName,
                dates: sheet.dates,
                start_date: sorted[0] ?? null,
                end_date: sorted[sorted.length - 1] ?? null,
            })
            .select('id, name')
            .single();

        if (courseError || !course) {
            throw new Error(courseError?.message ?? 'Could not create course.');
        }

        const names = sheet.students.map((s) => s.name);
        const { data: existing, error: existingError } = await client
            .from('students')
            .select(STUDENT_COLUMNS)
            .in('name', names);

        if (existingError) throw new Error(existingError.message);

        const byName = new Map(
            ((existing ?? []) as Student[]).map((s) => [
                normalizeName(s.name),
                s,
            ]),
        );

        const toCreate: Omit<Student, 'id'>[] = [];
        const toUpdate: Student[] = [];

        for (const row of sheet.students) {
            const match = byName.get(normalizeName(row.name));
            if (match) {
                const cells = union(match.parent_cells, row.parent_cells);
                const emails = union(match.parent_emails, row.parent_emails);
                const grade = match.grade ?? row.grade;
                const changed =
                    cells.length !== match.parent_cells.length ||
                    emails.length !== match.parent_emails.length ||
                    grade !== match.grade;
                if (changed) {
                    toUpdate.push({
                        ...match,
                        parent_cells: cells,
                        parent_emails: emails,
                        grade,
                    });
                }
            } else if (!toCreate.some((s) => normalizeName(s.name) === normalizeName(row.name))) {
                toCreate.push({
                    name: row.name,
                    grade: row.grade,
                    parent_cells: row.parent_cells,
                    parent_emails: row.parent_emails,
                });
            }
        }

        if (toCreate.length > 0) {
            const { data: created, error: createError } = await client
                .from('students')
                .insert(toCreate)
                .select(STUDENT_COLUMNS);
            if (createError) throw new Error(createError.message);
            for (const student of (created ?? []) as Student[]) {
                byName.set(normalizeName(student.name), student);
            }
        }

        for (const student of toUpdate) {
            const { error } = await client
                .from('students')
                .update({
                    parent_cells: student.parent_cells,
                    parent_emails: student.parent_emails,
                    grade: student.grade,
                })
                .eq('id', student.id);
            if (error) throw new Error(error.message);
        }

        const attendance = sheet.students
            .map((row) => {
                const student = byName.get(normalizeName(row.name));
                if (!student) return null;
                return {
                    student_id: student.id,
                    class_id: course.id,
                    level: row.level,
                    attended_statuses: row.attended_statuses,
                };
            })
            .filter((row): row is NonNullable<typeof row> => row !== null);

        if (attendance.length > 0) {
            const { error } = await client.from('attendance').insert(attendance);
            if (error) throw new Error(error.message);
        }

        return {
            courseId: course.id as number,
            courseName: course.name as string,
            studentsCreated: toCreate.length,
            studentsMatched: sheet.students.length - toCreate.length,
            attendanceRows: attendance.length,
        };
    }
}
