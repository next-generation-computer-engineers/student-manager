import { Suspense } from 'react';

import { PageHeader } from '@/components/page-header';
import Search from '@/components/search';
import { StudentList } from '@/components/student/student-list';
import { Skeleton } from '@/components/ui/skeleton';

function ListSkeleton() {
    return (
        <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-[88px] w-full rounded-lg" />
            ))}
        </div>
    );
}

export default async function StudentSearchPage(props: {
    searchParams?: Promise<{ query?: string; limit?: string }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams?.query ?? '';

    const parsedLimit = Number.parseInt(searchParams?.limit ?? '', 10);
    const limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

    return (
        <>
            <PageHeader
                title="Students"
                description="Search by name, parent phone number or parent email."
            />

            <Search
                placeholder="Search students..."
                filters={[{ name: 'limit', id: 'limit', text: 'Results' }]}
            />

            <Suspense key={`${query}-${limit}`} fallback={<ListSkeleton />}>
                <StudentList query={query} limit={limit} />
            </Suspense>
        </>
    );
}
