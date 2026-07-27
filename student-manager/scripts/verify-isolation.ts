/**
 * Confirms the sandbox cannot reach Supabase: both client factories must throw
 * while NEXT_PUBLIC_DATA_SOURCE is "mock", and the active provider must be the
 * on-disk mock.
 *
 *   npx tsx scripts/verify-isolation.ts
 */
import { getDataProvider } from '../lib/data';
import { DATA_SOURCE, isMockMode } from '../lib/config';
import { createClient as createBrowserClient } from '../lib/supabase/client';
import { createClient as createServerClient } from '../lib/supabase/server';

let failures = 0;

function check(label: string, condition: boolean, detail = '') {
    if (condition) {
        console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`);
    } else {
        failures += 1;
        console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
    }
}

async function main() {
    console.log('\n[1] configuration');
    check('data source is mock', DATA_SOURCE === 'mock', DATA_SOURCE);
    check('isMockMode is true', isMockMode);
    check(
        'no Supabase URL is configured',
        !process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(unset)',
    );
    check(
        'no Supabase anon key is configured',
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '(SET!)' : '(unset)',
    );

    console.log('\n[2] Supabase client factories refuse to run');
    let browserThrew = false;
    try {
        createBrowserClient();
    } catch (error) {
        browserThrew = error instanceof Error && error.message.includes('Refusing');
    }
    check('browser client throws', browserThrew);

    let serverThrew = false;
    try {
        await createServerClient();
    } catch (error) {
        serverThrew = error instanceof Error && error.message.includes('Refusing');
    }
    check('server client throws', serverThrew);

    console.log('\n[3] the active provider is the local mock');
    const provider = getDataProvider();
    check('provider kind is mock', provider.kind === 'mock', provider.kind);
    const courses = await provider.listCourses({ limit: 1 });
    check('reads come from the seeded store', courses.length === 1, courses[0]?.name);

    console.log(
        failures === 0
            ? '\nSandbox is isolated from production.\n'
            : `\n${failures} isolation check(s) failed.\n`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
