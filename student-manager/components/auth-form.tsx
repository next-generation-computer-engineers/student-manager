import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login as loginFn, signup as signupFn } from '@/lib/supabase/actions';

const errorMessageMap: Record<string, string> = {
    invalid_credentials: 'That email and password did not match.',
    email_already_exists:
        'An account with that email already exists. Try logging in instead.',
    unknown: 'Something went wrong. Please try again.',
};

export function AuthForm({
    mode,
    error,
}: {
    mode: 'login' | 'signup';
    error?: string;
}) {
    const login = mode === 'login';

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-xl">
                    {login ? 'Welcome back' : 'Create an account'}
                </CardTitle>
                <CardDescription>
                    {login
                        ? 'Sign in to manage students and attendance.'
                        : 'New accounts need an admin to approve them.'}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form className="flex flex-col gap-5">
                    {error && (
                        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/25 ring-inset">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            {errorMessageMap[error] ??
                                'An unexpected error occurred.'}
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="me@example.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete={
                                login ? 'current-password' : 'new-password'
                            }
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            formAction={login ? loginFn : signupFn}
                            className="w-full"
                        >
                            {login ? 'Log in' : 'Create account'}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            {login ? (
                                <>
                                    Don&apos;t have an account?{' '}
                                    <Link
                                        href="/auth/signup"
                                        className="font-medium text-primary hover:underline"
                                    >
                                        Sign up
                                    </Link>
                                </>
                            ) : (
                                <>
                                    Already have an account?{' '}
                                    <Link
                                        href="/auth/login"
                                        className="font-medium text-primary hover:underline"
                                    >
                                        Log in
                                    </Link>
                                </>
                            )}
                        </p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
