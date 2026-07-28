import { UserSearch } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { getDataProvider } from '@/lib/data';

import { StudentCard } from './student-card';

export const StudentList = async ({
    query,
    limit = 10,
    selectable,
    selectName,
    selected,
}: {
    query: string;
    limit?: number;
    selectable?: boolean;
    selectName?: string;
    selected?: number;
}) => {
    const students = await getDataProvider().listStudentSummaries({
        query,
        limit,
    });

    if (students.length === 0) {
        return (
            <EmptyState
                icon={UserSearch}
                title="No students found"
                description={
                    query
                        ? `Nothing matched "${query}". Try a name, phone number or email.`
                        : 'Import a sheet to add students.'
                }
            />
        );
    }

    return (
        <div className="grid gap-3">
            {students.map((student) => (
                <StudentCard
                    key={student.id}
                    student={student}
                    selectable={selectable}
                    selectName={selectName}
                    selected={selected === student.id}
                />
            ))}
        </div>
    );
};
