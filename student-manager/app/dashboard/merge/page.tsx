import { Suspense } from 'react';

import { PageHeader } from '@/components/page-header';
import Search from '@/components/search';
import { StudentList } from '@/components/student/student-list';
import { Skeleton } from '@/components/ui/skeleton';
import { getDataProvider } from '@/lib/data';

import { ConfirmButton } from './_components/confirm-button';

function ListSkeleton() {
    return (
        <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-[88px] w-full rounded-lg" />
            ))}
        </div>
    );
}

function parseId(value?: string): number | undefined {
    if (!value) return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function MergePage(props: {
    searchParams?: Promise<{
        query1?: string;
        query2?: string;
        selected1?: string;
        selected2?: string;
    }>;
}) {
    const searchParams = await props.searchParams;
    const query1 = searchParams?.query1 ?? '';
    const query2 = searchParams?.query2 ?? '';
    const selected1 = parseId(searchParams?.selected1);
    const selected2 = parseId(searchParams?.selected2);

    const provider = getDataProvider();
    const [first, second] = await Promise.all([
        selected1 ? provider.getStudent(selected1) : null,
        selected2 ? provider.getStudent(selected2) : null,
    ]);

    return (
        <>
            <PageHeader
                title="Merge students"
                description="Combine two duplicate records into one. Contacts and course history move to the student on the left."
            />

            <ConfirmButton
                selected1={selected1}
                selected2={selected2}
                name1={first?.name}
                name2={second?.name}
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="font-medium">Keep this student</h2>
                        <p className="text-sm text-muted-foreground">
                            {first
                                ? `Selected: ${first.name}`
                                : 'Nothing selected yet.'}
                        </p>
                    </div>
                    <Search
                        name="query1"
                        placeholder="Search for the student to keep..."
                    />
                    <Suspense key={`1-${query1}`} fallback={<ListSkeleton />}>
                        <StudentList
                            query={query1}
                            selectable
                            selectName="selected1"
                            selected={selected1}
                        />
                    </Suspense>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="font-medium">Merge in this student</h2>
                        <p className="text-sm text-muted-foreground">
                            {second
                                ? `Selected: ${second.name}`
                                : 'Nothing selected yet.'}
                        </p>
                    </div>
                    <Search
                        name="query2"
                        placeholder="Search for the duplicate..."
                    />
                    <Suspense key={`2-${query2}`} fallback={<ListSkeleton />}>
                        <StudentList
                            query={query2}
                            selectable
                            selectName="selected2"
                            selected={selected2}
                        />
                    </Suspense>
                </div>
            </div>
        </>
    );
}
