import { BookOpen } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { getDataProvider } from '@/lib/data';

import { CourseCard } from './course-card';

export const CourseList = async ({
    query,
    startDate,
    endDate,
    limit,
}: {
    query: string;
    startDate?: Date;
    endDate?: Date;
    limit: number;
}) => {
    const courses = await getDataProvider().listCourses({
        query,
        startDate,
        endDate,
        limit,
    });

    if (courses.length === 0) {
        return (
            <EmptyState
                icon={BookOpen}
                title="No courses found"
                description={
                    query
                        ? `Nothing matched "${query}". Try a different search or widen the date filters.`
                        : 'Import a sheet to add a course.'
                }
            />
        );
    }

    return (
        <div className="grid gap-3">
            {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
            ))}
        </div>
    );
};
