'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { SidebarAppInfo } from '@/components/sidebar/sidebar-app-info';
import {
    Sidebar as CNSidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { isRouteActive, routeGroups } from '@/lib/routes';

/**
 * `account` is rendered on the server (it reads the session) and passed in as a
 * slot, since a client component cannot import a server component.
 */
export const Sidebar = ({ account }: { account: ReactNode }) => {
    const pathname = usePathname();

    return (
        <CNSidebar collapsible="icon">
            <SidebarHeader>
                <SidebarAppInfo />
            </SidebarHeader>
            <SidebarContent>
                {routeGroups.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isRouteActive(
                                                item,
                                                pathname,
                                            )}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter>{account}</SidebarFooter>
            <SidebarRail />
        </CNSidebar>
    );
};
