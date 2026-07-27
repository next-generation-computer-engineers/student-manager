import { ArrowLeft, CalendarDays, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LevelBadge } from '@/components/attendance/status-badge';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getDataProvider } from '@/lib/data';
import { LEVELS, tally, type AttendedStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const CELL_STYLES: Record<AttendedStatus, string> = {
    present: 'bg-present/12 text-present',
    late: 'bg-late/15 text-late',
    absent: 'bg-absent/12 text-absent',
    excused: 'bg-excused/12 text-excused',
};

const CELL_LETTER: Record<AttendedStatus, string> = {
    present: 'P',
    late: 'L',
    absent: 'A',
    excused: 'E',
};

const LEGEND: AttendedStatus[] = ['present', 'late', 'excused', 'absent'];

function formatHeaderDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

export default async function CoursePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const courseId = Number.parseInt(id, 10);
    if (!Number.isFinite(courseId)) notFound();

    const provider = getDataProvider();
    const [course, roster] = await Promise.all([
        provider.getCourse(courseId),
        provider.getCourseRoster(courseId),
    ]);

    if (!course) notFound();

    const sorted = [...roster].sort((a, b) => {
        const levelDelta =
            LEVELS.indexOf(a.level ?? 'beginner') -
            LEVELS.indexOf(b.level ?? 'beginner');
        return levelDelta || a.student.name.localeCompare(b.student.name);
    });

    const allStatuses = roster.flatMap((entry) => entry.attended_statuses);
    const totals = tally(allStatuses);
    const graded = totals.present + totals.late + totals.absent;
    const rate =
        graded > 0
            ? Math.round(((totals.present + totals.late) / graded) * 100)
            : null;

    return (
        <>
            <PageHeader
                title={course.name}
                description={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" />
                            {course.dates.length}{' '}
                            {course.dates.length === 1 ? 'session' : 'sessions'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Users className="size-3.5" />
                            {roster.length} enrolled
                        </span>
                    </span>
                }
                actions={
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/courses">
                            <ArrowLeft className="size-4" />
                            All courses
                        </Link>
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Students" value={roster.length} icon={Users} />
                <StatCard
                    label="Attendance rate"
                    value={rate === null ? '—' : `${rate}%`}
                    hint="Present or late"
                />
                <StatCard label="Present" value={totals.present} />
                <StatCard
                    label="Absent"
                    value={totals.absent}
                    hint={`${totals.late} late · ${totals.excused} excused`}
                />
            </div>

            {sorted.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Nobody is enrolled yet"
                    description="This course has no attendance records."
                />
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Legend:</span>
                        {LEGEND.map((status) => (
                            <span
                                key={status}
                                className="inline-flex items-center gap-1.5"
                            >
                                <span
                                    className={cn(
                                        'flex size-5 items-center justify-center rounded font-medium',
                                        CELL_STYLES[status],
                                    )}
                                >
                                    {CELL_LETTER[status]}
                                </span>
                                <span className="capitalize">{status}</span>
                            </span>
                        ))}
                    </div>

                    <div className="scrollbar-thin overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="sticky left-0 z-20 min-w-[180px] bg-card">
                                        Student
                                    </TableHead>
                                    <TableHead className="min-w-[70px]">
                                        Grade
                                    </TableHead>
                                    <TableHead className="min-w-[120px]">
                                        Level
                                    </TableHead>
                                    {course.dates.map((date, index) => (
                                        <TableHead
                                            key={`${date}-${index}`}
                                            className="min-w-[64px] text-center whitespace-nowrap"
                                        >
                                            {formatHeaderDate(date)}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sorted.map((entry) => (
                                    <TableRow key={entry.student.id}>
                                        <TableCell className="sticky left-0 z-10 bg-card font-medium">
                                            <Link
                                                href={`/dashboard/student/${entry.student.id}`}
                                                className="hover:text-primary hover:underline"
                                            >
                                                {entry.student.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {entry.student.grade ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <LevelBadge level={entry.level} />
                                        </TableCell>
                                        {course.dates.map((date, index) => {
                                            const status =
                                                entry.attended_statuses[index];
                                            return (
                                                <TableCell
                                                    key={`${date}-${index}`}
                                                    className="text-center"
                                                >
                                                    {status ? (
                                                        <span
                                                            title={status}
                                                            className={cn(
                                                                'inline-flex size-6 items-center justify-center rounded text-xs font-medium',
                                                                CELL_STYLES[
                                                                    status
                                                                ],
                                                            )}
                                                        >
                                                            {
                                                                CELL_LETTER[
                                                                    status
                                                                ]
                                                            }
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            –
                                                        </span>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </>
    );
}
