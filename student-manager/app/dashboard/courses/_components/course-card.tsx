import { CalendarDays } from 'lucide-react';
import Link from 'next/link';

import type { Course } from '@/lib/types';

const MAX_VISIBLE_DATES = 8;

function formatDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

export const CourseCard = ({ course }: { course: Course }) => {
    const visible = course.dates.slice(0, MAX_VISIBLE_DATES);
    const overflow = course.dates.length - visible.length;

    const year = course.start_date
        ? new Date(`${course.start_date}T00:00:00`).getFullYear()
        : null;

    return (
        <Link
            href={`/dashboard/course/${course.id}`}
            className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/60"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="truncate font-medium">{course.name}</h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays className="size-3.5 shrink-0" />
                        {course.dates.length}{' '}
                        {course.dates.length === 1 ? 'session' : 'sessions'}
                        {year !== null && ` · ${year}`}
                    </p>
                </div>
            </div>

            {visible.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {visible.map((date, index) => (
                        <span
                            key={`${date}-${index}`}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums"
                        >
                            {formatDate(date)}
                        </span>
                    ))}
                    {overflow > 0 && (
                        <span className="rounded-md px-2 py-0.5 text-xs text-muted-foreground">
                            +{overflow} more
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
};
