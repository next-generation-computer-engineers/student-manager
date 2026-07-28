import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth-form';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { isMockMode } from '@/lib/config';

export default async function SignupPage(props: {
    searchParams?: Promise<{ error?: string }>;
}) {
    if (isMockMode) redirect('/dashboard');

    const searchParams = await props.searchParams;

    return (
        <div className="relative flex min-h-svh w-full flex-col items-center justify-center gap-8 p-6">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="flex flex-col items-center gap-3">
                <BrandLogo
                    variant="full"
                    className="h-12 sm:h-14"
                    priority
                />
                <p className="text-sm text-muted-foreground">Student Manager</p>
            </div>

            <AuthForm mode="signup" error={searchParams?.error} />
        </div>
    );
}
