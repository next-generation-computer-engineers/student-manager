'use server';

import { revalidatePath } from 'next/cache';

import { getDataProvider } from '@/lib/data';
import type { ImportSummary, ParsedSheet } from '@/lib/import/types';

export type CommitResult =
    | { ok: true; summary: ImportSummary }
    | { ok: false; error: string };

/**
 * Commits exactly the rows the user reviewed in the preview. Re-validated here
 * because a server action is a public endpoint.
 */
export async function commitImportAction(
    sheet: ParsedSheet,
): Promise<CommitResult> {
    if (!sheet || typeof sheet !== 'object') {
        return { ok: false, error: 'Nothing to import.' };
    }

    const courseName = sheet.courseName?.trim();
    if (!courseName) {
        return { ok: false, error: 'Give the course a name first.' };
    }

    if (!Array.isArray(sheet.students) || sheet.students.length === 0) {
        return { ok: false, error: 'There are no student rows to import.' };
    }

    const blocking = (sheet.issues ?? []).filter(
        (issue) => issue.level === 'error',
    );
    if (blocking.length > 0) {
        return { ok: false, error: blocking[0].message };
    }

    for (const student of sheet.students) {
        if (!student.name?.trim()) {
            return {
                ok: false,
                error: `Row ${student.row} has no student name.`,
            };
        }
        if (student.attended_statuses.length !== sheet.dates.length) {
            return {
                ok: false,
                error: `Row ${student.row} has ${student.attended_statuses.length} attendance values but the course has ${sheet.dates.length} sessions.`,
            };
        }
    }

    try {
        const summary = await getDataProvider().importSheet({
            ...sheet,
            courseName,
        });

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/courses');
        revalidatePath('/dashboard/search');

        return { ok: true, summary };
    } catch (error) {
        console.error('[import] commit failed', error);
        return {
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Could not save the import.',
        };
    }
}
