'use client';

import { Check, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { StudentSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

/** A student is "active" if any of their sessions fall in the last 90 days. */
function isActive(lastDate: string | null): boolean {
    if (!lastDate) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    return new Date(lastDate) > cutoff;
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const StudentCard = ({
    student,
    selectable = false,
    selectName = '',
    selected = false,
}: {
    student: StudentSummary;
    selectable?: boolean;
    selectName?: string;
    selected?: boolean;
}) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { replace } = useRouter();

    const active = isActive(student.lastDate);

    const content = (
        <>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                {initials(student.name)}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{student.name}</p>
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                            active
                                ? 'bg-present/12 text-present ring-present/25'
                                : 'bg-muted text-muted-foreground ring-border',
                        )}
                    >
                        {active ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {student.grade !== null && `Grade ${student.grade} · `}
                    {student.courseCount}{' '}
                    {student.courseCount === 1 ? 'course' : 'courses'}
                    {student.lastDate &&
                        ` · last seen ${new Date(
                            `${student.lastDate}T00:00:00`,
                        ).toLocaleDateString()}`}
                </p>

                {(student.parent_cells.length > 0 ||
                    student.parent_emails.length > 0) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {student.parent_cells[0] && (
                            <span className="inline-flex items-center gap-1">
                                <Phone className="size-3" />
                                {student.parent_cells[0]}
                                {student.parent_cells.length > 1 &&
                                    ` +${student.parent_cells.length - 1}`}
                            </span>
                        )}
                        {student.parent_emails[0] && (
                            <span className="inline-flex min-w-0 items-center gap-1">
                                <Mail className="size-3 shrink-0" />
                                <span className="truncate">
                                    {student.parent_emails[0]}
                                </span>
                                {student.parent_emails.length > 1 &&
                                    ` +${student.parent_emails.length - 1}`}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {selectable && selected && (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" />
                </span>
            )}
        </>
    );

    const baseClass =
        'flex items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/60';

    if (!selectable) {
        return (
            <Link
                href={`/dashboard/student/${student.id}`}
                className={baseClass}
            >
                {content}
            </Link>
        );
    }

    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set(selectName, student.id.toString());
                replace(`${pathname}?${params.toString()}`);
            }}
            className={cn(
                baseClass,
                'w-full cursor-pointer',
                selected && 'border-primary bg-accent/60 ring-2 ring-primary/30',
            )}
        >
            {content}
        </button>
    );
};
