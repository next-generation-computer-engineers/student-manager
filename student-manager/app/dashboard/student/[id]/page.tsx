import { ArrowLeft, BookOpen, MailIcon, PhoneIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AttendanceBar } from '@/components/attendance/attendance-bar';
import { LevelBadge } from '@/components/attendance/status-badge';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { getDataProvider } from '@/lib/data';
import { attendanceRate, tally } from '@/lib/types';

function formatRange(dates: string[]): string {
    if (dates.length === 0) return 'No dates';
    const sorted = [...dates].sort();
    const format = (value: string) =>
        new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    const start = format(sorted[0]);
    const end = format(sorted[sorted.length - 1]);
    return start === end ? start : `${start} – ${end}`;
}

export default async function StudentPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const studentId = Number.parseInt(id, 10);
    if (!Number.isFinite(studentId)) notFound();

    const provider = getDataProvider();
    const [student, enrollments] = await Promise.all([
        provider.getStudent(studentId),
        provider.getStudentEnrollments(studentId),
    ]);

    if (!student) notFound();

    const allStatuses = enrollments.flatMap((e) => e.attended_statuses);
    const totals = tally(allStatuses);
    const rate = attendanceRate(allStatuses);

    return (
        <>
            <PageHeader
                title={student.name}
                description={
                    student.grade !== null
                        ? `Grade ${student.grade}`
                        : 'Grade not recorded'
                }
                actions={
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/search">
                            <ArrowLeft className="size-4" />
                            All students
                        </Link>
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Courses"
                    value={enrollments.length}
                    icon={BookOpen}
                />
                <StatCard
                    label="Attendance rate"
                    value={
                        rate === null ? '—' : `${Math.round(rate * 100)}%`
                    }
                    hint="Present or late"
                />
                <StatCard label="Present" value={totals.present} />
                <StatCard
                    label="Absent"
                    value={totals.absent}
                    hint={`${totals.late} late · ${totals.excused} excused`}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Parent contact</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            Phone numbers
                        </p>
                        {student.parent_cells.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                None on file
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {student.parent_cells.map((cell) => (
                                    <li key={cell}>
                                        <a
                                            href={`tel:${cell}`}
                                            className="inline-flex items-center gap-2 text-sm hover:text-primary hover:underline"
                                        >
                                            <PhoneIcon className="size-3.5 text-muted-foreground" />
                                            {cell}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            Email addresses
                        </p>
                        {student.parent_emails.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                None on file
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {student.parent_emails.map((email) => (
                                    <li key={email} className="min-w-0">
                                        <a
                                            href={`mailto:${email}`}
                                            className="inline-flex min-w-0 items-center gap-2 text-sm hover:text-primary hover:underline"
                                        >
                                            <MailIcon className="size-3.5 shrink-0 text-muted-foreground" />
                                            <span className="truncate">
                                                {email}
                                            </span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h2 className="text-lg font-semibold tracking-tight">
                    Course history
                </h2>

                {enrollments.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title="No courses yet"
                        description="This student has not been enrolled in any course."
                    />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {enrollments.map((enrollment) => {
                            const counts = tally(enrollment.attended_statuses);
                            return (
                                <Link
                                    key={enrollment.id}
                                    href={`/dashboard/course/${enrollment.course.id}`}
                                    className="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/60"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="min-w-0 font-medium">
                                            {enrollment.course.name}
                                        </h3>
                                        <LevelBadge
                                            level={enrollment.level}
                                            className="shrink-0"
                                        />
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        {formatRange(enrollment.course.dates)}
                                    </p>

                                    <div className="mt-auto space-y-2">
                                        <AttendanceBar
                                            statuses={
                                                enrollment.attended_statuses
                                            }
                                        />
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                            <span className="text-present">
                                                {counts.present} present
                                            </span>
                                            <span className="text-late">
                                                {counts.late} late
                                            </span>
                                            <span className="text-excused">
                                                {counts.excused} excused
                                            </span>
                                            <span className="text-absent">
                                                {counts.absent} absent
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
