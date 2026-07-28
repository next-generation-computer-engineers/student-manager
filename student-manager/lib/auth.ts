import { isMockMode } from '@/lib/config';
import { getDataProvider } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import type { AuthUser } from '@/lib/types';

/** Matches the admin row in lib/data/mock/seed.json. */
export const DEV_USER: AuthUser = {
    id: 'dev-admin-0000-0000-000000000001',
    email: 'admin@dev.local',
};

export async function getSessionUser(): Promise<AuthUser | null> {
    if (isMockMode) return DEV_USER;

    const client = await createClient();
    const {
        data: { user },
    } = await client.auth.getUser();

    if (!user) return null;
    return { id: user.id, email: user.email ?? '' };
}

export async function amIApproved(): Promise<boolean> {
    if (isMockMode) return true;

    const client = await createClient();
    const { data, error } = await client.rpc('am_i_approved');
    if (error) throw new Error(error.message);
    return Boolean(data);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
    const user = await getSessionUser();
    if (!user) return false;

    const users = await getDataProvider().listUsers();
    return users.some((row) => row.id === user.id && row.admin);
}
