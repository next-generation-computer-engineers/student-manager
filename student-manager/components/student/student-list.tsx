import { createClient } from '@/lib/supabase/server';
import { StudentCard } from './student-card';
import { Student } from '@/lib/types';

export const StudentList = async ({
    query,
    selectable,
    selectName,
    selected,
}: {
    query: string;
    selectable?: boolean;
    selectName?: string;
    selected?: number;
}) => {
    const client = await createClient();
    const { data: students, error } = await client
        .from('students')
        .select('id, name, grade, parent_cells, parent_emails')
        .ilike('name', `%${query}%`)
        .limit(10);

    if (error) {
        console.error('Error fetching students:', error);
        return <div>Error loading students.</div>;
    }

    if (!students || students.length === 0) {
        return <div>No students found.</div>;
    }

    const processedStudents: (Student & {
        joinDate: Date;
        status: 'active' | 'inactive';
    })[] = await Promise.all(
        students.map(async (student) => {
            const { data: attendanceDetails, error: attendanceError } =
                await client
                    .from('attendance')
                    .select('classes(name, dates)')
                    .eq('student_id', student.id);

            if (attendanceError) {
                console.error(
                    'Error fetching attendance details:',
                    attendanceError,
                );
                return {
                    ...student,
                    joinDate: new Date(),
                    status: 'inactive' as const,
                };
            }

            const classDates = attendanceDetails
                // @ts-expect-error - supabase types are not correct for single select
                ?.flatMap((detail) => detail.classes?.dates || [])
                .filter((date) => date)
                .sort();
            const joinDate =
                classDates?.length > 0 ? new Date(classDates[0]) : new Date();

            const mostRecentDate =
                classDates?.length > 0
                    ? new Date(classDates[classDates.length - 1])
                    : null;
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const status =
                mostRecentDate && mostRecentDate > ninetyDaysAgo
                    ? 'active'
                    : 'inactive';

            return {
                ...student,
                joinDate,
                status,
            };
        }),
    );

    return processedStudents.map((student) => (
        <StudentCard
            key={student.id}
            student={student}
            joinDate={student.joinDate}
            status={student.status}
            selectable={selectable}
            selectName={selectName}
            selected={selected === student.id}
        />
    ));
};
