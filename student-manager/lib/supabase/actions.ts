'use server';

import { redirect } from 'next/navigation';

import { isMockMode } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
    if (isMockMode) redirect('/dashboard');

    const supabase = await createClient();

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error?.code === 'invalid_credentials') {
        redirect('/auth/login?error=invalid_credentials');
    }

    if (error) {
        console.error('Error logging in:', error);
        redirect('/auth/login?error=unknown');
    }

    const { data: amIApproved, error: amIApprovedError } =
        await supabase.rpc('am_i_approved');

    if (amIApprovedError) {
        console.error('Error checking approval:', amIApprovedError);
        redirect('/auth/login?error=unknown');
    }

    if (!amIApproved) redirect('/awaiting-approval');

    redirect('/dashboard');
}

export async function signup(formData: FormData) {
    if (isMockMode) redirect('/dashboard');

    const supabase = await createClient();

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const { error } = await supabase.auth.signUp(data);

    if (error) {
        console.error('Error signing up:', error);
        redirect('/auth/signup?error=unknown');
    }

    const { data: amIApproved, error: amIApprovedError } =
        await supabase.rpc('am_i_approved');

    if (amIApprovedError) {
        console.error('Error checking approval:', amIApprovedError);
        redirect('/auth/signup?error=unknown');
    }

    if (!amIApproved) redirect('/awaiting-approval');

    redirect('/dashboard');
}

export async function signOut() {
    if (isMockMode) redirect('/dashboard');

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/auth/login');
}
