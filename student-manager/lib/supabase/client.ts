import { createBrowserClient } from '@supabase/ssr';

import { isMockMode } from '@/lib/config';

export function createClient() {
    if (isMockMode) {
        throw new Error(
            'Refusing to create a Supabase client while NEXT_PUBLIC_DATA_SOURCE is "mock". ' +
                'Go through lib/data instead so dev work cannot reach production.',
        );
    }

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}
