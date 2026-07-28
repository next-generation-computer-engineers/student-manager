import { BookOpen, CalendarCheck, Upload, Users } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { isCurrentUserAdmin } from '@/lib/auth';
import { getDataProvider } from '@/lib/data';
import { ATTENDED_STATUSES } from '@/lib/types';

const STATUS_BAR: Record<string, string> = {
    present: 'bg-present',
    late: 'bg-late',
    excused: 'bg-excused',
    absent: 'bg-absent',
};

function formatRange(start: string | null, end: string | null): string {
    if (!start) return 'No dates';
    const format = (value: string) =>
        new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    return end && end !== start ? `${format(start)} – ${format(end)}` : format(start);
}

export default async function DashboardPage() {
    const [overview, isAdmin] = await Promise.all([
        getDataProvider().getOverview(),
        isCurrentUserAdmin(),
    ]);

    const attended =
        overview.statusTotals.present + overview.statusTotals.late;
    const rate =
        overview.sessions > 0
            ? Math.round((attended / overview.sessions) * 100)
            : null;

    return (
        <>
            <PageHeader
                title="Dashboard"
                description="An overview of everything currently tracked."
                actions={
                    isAdmin ? (
                        <Button asChild>
                            <Link href="/dashboard/import">
                                <Upload className="size-4" />
                                Import a sheet
                            </Link>
                        </Button>
                    ) : undefined
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Students"
                    value={overview.students.toLocaleString()}
                    icon={Users}
                />
                <StatCard
                    label="Courses"
                    value={overview.courses.toLocaleString()}
                    icon={BookOpen}
                />
                <StatCard
                    label="Enrollments"
                    value={overview.enrollments.toLocaleString()}
                    icon={CalendarCheck}
                    hint={`${overview.sessions.toLocaleString()} session records`}
                />
                <StatCard
                    label="Attendance rate"
                    value={rate === null ? '—' : `${rate}%`}
                    icon={CalendarCheck}
                    hint="Present or late, across all sessions"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Attendance breakdown</CardTitle>
                        <CardDescription>
                            Every recorded session, by outcome.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {overview.sessions === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No attendance has been recorded yet.
                            </p>
                        ) : (
                            ATTENDED_STATUSES.map((status) => {
                                const count = overview.statusTotals[status];
                                const share = (count / overview.sessions) * 100;
                                return (
                                    <div key={status} className="space-y-1.5">
                                        <div className="flex items-baseline justify-between text-sm">
                                            <span className="capitalize">
                                                {status}
                                            </span>
                                            <span className="tabular-nums text-muted-foreground">
                                                {count.toLocaleString()} (
                                                {share.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={STATUS_BAR[status]}
                                                style={{
                                                    width: `${share}%`,
                                                    height: '100%',
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Most recent courses</CardTitle>
                        <CardDescription>
                            The latest courses to finish.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {overview.recentCourses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No courses yet. Import a sheet to get started.
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {overview.recentCourses.map((course) => (
                                    <li key={course.id}>
                                        <Link
                                            href={`/dashboard/course/${course.id}`}
                                            className="flex items-center justify-between gap-4 py-2.5 text-sm transition-colors hover:text-primary"
                                        >
                                            <span className="truncate font-medium">
                                                {course.name}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {formatRange(
                                                    course.start_date,
                                                    course.end_date,
                                                )}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
