'use server';

import { revalidatePath } from 'next/cache';

import { isCurrentUserAdmin } from '@/lib/auth';
import { getDataProvider } from '@/lib/data';

export interface ActionResult {
    ok: boolean;
    error?: string;
}

export async function mergeStudentsAction(
    keepId: number,
    absorbId: number,
): Promise<ActionResult> {
    if (!Number.isFinite(keepId) || !Number.isFinite(absorbId)) {
        return { ok: false, error: 'Pick two students first.' };
    }
    if (keepId === absorbId) {
        return { ok: false, error: 'Those are the same student.' };
    }

    try {
        await getDataProvider().mergeStudents(keepId, absorbId);
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Merge failed.',
        };
    }

    revalidatePath('/dashboard/merge');
    revalidatePath('/dashboard/search');
    return { ok: true };
}

export async function setUserFlagsAction(
    id: string,
    patch: { approved?: boolean; admin?: boolean },
): Promise<ActionResult> {
    // The browser can call a server action directly, so re-check the caller's
    // role here rather than trusting the UI that rendered the button.
    if (!(await isCurrentUserAdmin())) {
        return { ok: false, error: 'Only admins can change user access.' };
    }

    try {
        await getDataProvider().setUserFlags(id, patch);
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Update failed.',
        };
    }

    revalidatePath('/dashboard/approvals');
    return { ok: true };
}
