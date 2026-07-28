import type { AttendedStatus, Level } from '@/lib/types';
import { cn } from '@/lib/utils';

// Written out in full because Tailwind only sees class names that appear
// literally in the source.
const STATUS_STYLES: Record<AttendedStatus, string> = {
    present: 'bg-present/12 text-present ring-present/25',
    late: 'bg-late/15 text-late ring-late/30',
    absent: 'bg-absent/12 text-absent ring-absent/25',
    excused: 'bg-excused/12 text-excused ring-excused/25',
};

const STATUS_LABELS: Record<AttendedStatus, string> = {
    present: 'Present',
    late: 'Late',
    absent: 'Absent',
    excused: 'Excused',
};

export function StatusBadge({
    status,
    className,
}: {
    status: AttendedStatus;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                STATUS_STYLES[status],
                className,
            )}
        >
            {STATUS_LABELS[status]}
        </span>
    );
}

const STATUS_DOTS: Record<AttendedStatus, string> = {
    present: 'bg-present',
    late: 'bg-late',
    absent: 'bg-absent',
    excused: 'bg-excused',
};

export function StatusDot({
    status,
    className,
}: {
    status: AttendedStatus;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-block size-2 shrink-0 rounded-full',
                STATUS_DOTS[status],
                className,
            )}
        />
    );
}

const LEVEL_STYLES: Record<Level, string> = {
    beginner:
        'bg-beginner/20 text-beginner ring-beginner/35 dark:bg-beginner/25 dark:text-beginner dark:ring-beginner/45',
    intermediate:
        'bg-intermediate/20 text-intermediate ring-intermediate/35 dark:bg-intermediate/25 dark:text-intermediate dark:ring-intermediate/45',
    advanced:
        'bg-advanced/20 text-advanced ring-advanced/35 dark:bg-advanced/25 dark:text-advanced dark:ring-advanced/45',
};

const LEVEL_LABELS: Record<Level, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

export function LevelBadge({
    level,
    className,
}: {
    level: Level | null;
    className?: string;
}) {
    if (level === null) {
        return (
            <span
                className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border',
                    className,
                )}
            >
                Unset
            </span>
        );
    }

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                LEVEL_STYLES[level],
                className,
            )}
        >
            {LEVEL_LABELS[level]}
        </span>
    );
}

export { STATUS_LABELS, LEVEL_LABELS };
