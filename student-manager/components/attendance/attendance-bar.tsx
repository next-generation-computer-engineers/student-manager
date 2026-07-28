import { ATTENDED_STATUSES, tally, type AttendedStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const SEGMENT_STYLES: Record<AttendedStatus, string> = {
    present: 'bg-present',
    late: 'bg-late',
    excused: 'bg-excused',
    absent: 'bg-absent',
};

export function AttendanceBar({
    statuses,
    className,
}: {
    statuses: AttendedStatus[];
    className?: string;
}) {
    const counts = tally(statuses);
    const total = statuses.length;

    if (total === 0) {
        return (
            <div
                className={cn('h-2 w-full rounded-full bg-muted', className)}
                aria-hidden
            />
        );
    }

    const label = ATTENDED_STATUSES.filter((status) => counts[status] > 0)
        .map((status) => `${counts[status]} ${status}`)
        .join(', ');

    return (
        <div
            className={cn(
                'flex h-2 w-full overflow-hidden rounded-full bg-muted',
                className,
            )}
            role="img"
            aria-label={`Attendance: ${label}`}
        >
            {ATTENDED_STATUSES.map((status) =>
                counts[status] === 0 ? null : (
                    <div
                        key={status}
                        className={SEGMENT_STYLES[status]}
                        style={{
                            width: `${(counts[status] / total) * 100}%`,
                        }}
                    />
                ),
            )}
        </div>
    );
}
