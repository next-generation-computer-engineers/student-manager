import { Suspense } from 'react';

import { PageHeader } from '@/components/page-header';
import Search from '@/components/search';
import { Skeleton } from '@/components/ui/skeleton';

import { CourseList } from './_components/course-list';

function ListSkeleton() {
    return (
        <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[104px] w-full rounded-lg" />
            ))}
        </div>
    );
}

function parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function CoursesPage(props: {
    searchParams?: Promise<{
        query?: string;
        start_date?: string;
        end_date?: string;
        limit?: string;
    }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams?.query ?? '';
    const startDate = parseDate(searchParams?.start_date);
    const endDate = parseDate(searchParams?.end_date);

    const parsedLimit = Number.parseInt(searchParams?.limit ?? '', 10);
    const limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

    return (
        <>
            <PageHeader
                title="Courses"
                description="Browse every course and open one to see its attendance grid."
            />

            <Search
                placeholder="Search courses..."
                filters={[
                    { name: 'date', id: 'start_date', text: 'Starts on or after' },
                    { name: 'date', id: 'end_date', text: 'Ends on or before' },
                    { name: 'limit', id: 'limit', text: 'Results' },
                ]}
            />

            <Suspense
                key={`${query}-${searchParams?.start_date}-${searchParams?.end_date}-${limit}`}
                fallback={<ListSkeleton />}
            >
                <CourseList
                    query={query}
                    startDate={startDate}
                    endDate={endDate}
                    limit={limit}
                />
            </Suspense>
        </>
    );
}
