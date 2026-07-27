import { LogOut } from 'lucide-react';

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { getSessionUser } from '@/lib/auth';
import { signOut } from '@/lib/supabase/actions';

export const SidebarAccountInfo = async () => {
    const user = await getSessionUser();

    return (
        <SidebarMenu>
            {user && (
                <SidebarMenuItem>
                    <div className="flex items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 group-data-[collapsible=icon]:hidden">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
                            {user.email.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate text-sm text-sidebar-foreground/80">
                            {user.email}
                        </span>
                    </div>
                </SidebarMenuItem>
            )}
            <SidebarMenuItem>
                <form action={signOut} className="w-full">
                    <SidebarMenuButton
                        asChild
                        tooltip="Sign out"
                        className="w-full"
                    >
                        <button type="submit">
                            <LogOut />
                            <span>Sign out</span>
                        </button>
                    </SidebarMenuButton>
                </form>
            </SidebarMenuItem>
        </SidebarMenu>
    );
};
