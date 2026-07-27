import { Clock } from 'lucide-react';
import { redirect } from 'next/navigation';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { amIApproved } from '@/lib/auth';
import { signOut } from '@/lib/supabase/actions';

export default async function AwaitingApprovalPage() {
    let approved = false;
    try {
        approved = await amIApproved();
    } catch (error) {
        console.error('Error checking approval status:', error);
    }

    if (approved) redirect('/dashboard');

    return (
        <div className="relative flex min-h-svh w-full items-center justify-center p-6">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-late/12">
                        <Clock className="size-5 text-late" />
                    </div>
                    <CardTitle>Awaiting approval</CardTitle>
                    <CardDescription>
                        Your account has been created but still needs an admin
                        to approve it. Ask an organisation admin to approve you,
                        then reload this page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={signOut}>
                        <Button variant="outline" type="submit">
                            Sign out
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
