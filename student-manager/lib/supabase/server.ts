import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { isMockMode } from '@/lib/config';

export async function createClient() {
    if (isMockMode) {
        throw new Error(
            'Refusing to create a Supabase client while NEXT_PUBLIC_DATA_SOURCE is "mock". ' +
                'Go through lib/data instead so dev work cannot reach production.',
        );
    }

    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        },
    );
}
