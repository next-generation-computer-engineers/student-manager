import Link from 'next/link';

import { BrandLogo } from '@/components/brand-logo';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

export const SidebarAppInfo = () => {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size="lg"
                    asChild
                    className="h-auto gap-2.5 py-2"
                >
                    <Link href="/dashboard">
                        <BrandLogo
                            variant="mark"
                            className="hidden size-8 group-data-[collapsible=icon]:inline-flex"
                        />
                        <div className="flex min-w-0 flex-col items-start gap-1 group-data-[collapsible=icon]:hidden">
                            <BrandLogo variant="full" className="h-8" />
                            <span className="truncate text-xs text-sidebar-foreground/60">
                                Student Manager
                            </span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
};
