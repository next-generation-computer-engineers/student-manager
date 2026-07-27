import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSessionUser } from '@/lib/auth';
import { getDataProvider } from '@/lib/data';

import { UserTable } from './_components/user-table';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
    const user = await getSessionUser();
    if (!user) redirect('/auth/login');

    const users = await getDataProvider().listUsers();
    const selfAdmin = users.some((row) => row.id === user.id && row.admin);

    const pending = users.filter((row) => !row.approved && !row.admin).length;

    return (
        <>
            <PageHeader
                title="Approvals"
                description={
                    selfAdmin
                        ? 'Approve new sign-ups and manage who has admin rights.'
                        : 'Only admins can change access. Emails are partly hidden.'
                }
            />

            <Tabs defaultValue="awaitingApproval">
                <TabsList>
                    <TabsTrigger value="awaitingApproval">
                        Awaiting approval
                        {pending > 0 && (
                            <span className="ml-1.5 rounded-full bg-late/15 px-1.5 text-xs font-medium text-late tabular-nums">
                                {pending}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="admin">Admins</TabsTrigger>
                    <TabsTrigger value="all">Everyone</TabsTrigger>
                </TabsList>

                <TabsContent value="awaitingApproval" className="mt-4">
                    <UserTable
                        users={users}
                        filter="awaitingApproval"
                        actionsEnabled={selfAdmin}
                        currentUserId={user.id}
                    />
                </TabsContent>
                <TabsContent value="admin" className="mt-4">
                    <UserTable
                        users={users}
                        filter="admin"
                        actionsEnabled={selfAdmin}
                        currentUserId={user.id}
                    />
                </TabsContent>
                <TabsContent value="all" className="mt-4">
                    <UserTable
                        users={users}
                        filter="all"
                        actionsEnabled={selfAdmin}
                        currentUserId={user.id}
                    />
                </TabsContent>
            </Tabs>
        </>
    );
}
