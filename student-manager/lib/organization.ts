import { isMockMode } from '@/lib/config';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Organization id for the current session. Read from public.users.organization_id
 * and stamped as `organization` on students, classes, and attendance rows.
 */
export async function getOrganizationId(): Promise<number> {
    if (isMockMode) {
        const fromEnv = process.env.ORGANIZATION_ID;
        if (fromEnv) {
            const parsed = Number.parseInt(fromEnv, 10);
            if (Number.isFinite(parsed)) return parsed;
        }
        throw new Error(
            'Set ORGANIZATION_ID in .env.local for mock imports, or use Supabase auth.',
        );
    }

    const user = await getSessionUser();
    if (!user) {
        throw new Error('Sign in required to resolve organization.');
    }

    const client = await createClient();
    const { data, error } = await client
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

    if (error) throw new Error(error.message);

    const orgId = (data as { organization_id: number | null } | null)
        ?.organization_id;
    if (orgId == null) {
        throw new Error(
            'Your user account has no organization_id. Ask an admin to assign one.',
        );
    }

    return orgId;
}
