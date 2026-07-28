/**
 * Creates (or updates) an app user in Supabase Auth and the public.users table.
 *
 * Requires the service role key — never commit this to git.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/add-user.ts om@cengclass.org
 *   SUPABASE_SERVICE_ROLE_KEY=... ADD_USER_PASSWORD='...' npx tsx scripts/add-user.ts om@cengclass.org --admin
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv.find((arg) => arg.includes('@')) ?? 'om@cengclass.org';
const asAdmin = process.argv.includes('--admin');
const password =
    process.env.ADD_USER_PASSWORD ??
    process.argv.find((arg) => !arg.startsWith('-') && !arg.includes('@'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
    console.error(
        'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
    );
    process.exit(1);
}

if (!password) {
    console.error(
        'Set ADD_USER_PASSWORD or pass a password as the second argument.',
    );
    process.exit(1);
}

const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } =
    await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

let userId = created.user?.id;

if (createError) {
    if (!createError.message.toLowerCase().includes('already')) {
        console.error('Auth create failed:', createError.message);
        process.exit(1);
    }

    const { data: listed, error: listError } =
        await admin.auth.admin.listUsers();
    if (listError) {
        console.error('Could not list users:', listError.message);
        process.exit(1);
    }

    const existing = listed.users.find(
        (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!existing) {
        console.error('User exists but could not be looked up.');
        process.exit(1);
    }

    userId = existing.id;
    const { error: updateError } = await admin.auth.admin.updateUserById(
        userId,
        { password, email_confirm: true },
    );
    if (updateError) {
        console.error('Auth update failed:', updateError.message);
        process.exit(1);
    }
    console.log('Auth user already existed; password updated.');
}

if (!userId) {
    console.error('No user id returned.');
    process.exit(1);
}

const { error: upsertError } = await admin.from('users').upsert(
    {
        id: userId,
        email,
        approved: true,
        admin: asAdmin,
    },
    { onConflict: 'id' },
);

if (upsertError) {
    console.error('users upsert failed:', upsertError.message);
    console.error(
        'If the table is missing, this Supabase project may not have the app schema yet.',
    );
    process.exit(1);
}

console.log(`Done: ${email}`);
console.log(`  id: ${userId}`);
console.log(`  approved: true`);
console.log(`  admin: ${asAdmin}`);
