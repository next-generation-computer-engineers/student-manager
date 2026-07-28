import { BreadcrumbTitle } from '@/components/breadcrumb-title';
import { Sidebar } from '@/components/sidebar';
import { SidebarAccountInfo } from '@/components/sidebar/sidebar-account-info';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { isCurrentUserAdmin } from '@/lib/auth';

// Always read live counts and rosters from Supabase — never a stale build cache.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const isAdmin = await isCurrentUserAdmin();

    return (
        <SidebarProvider>
            <Sidebar account={<SidebarAccountInfo />} isAdmin={isAdmin} />
            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-1 data-[orientation=vertical]:h-4"
                    />
                    <BreadcrumbTitle />
                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </header>
                <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
