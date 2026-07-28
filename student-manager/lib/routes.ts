import {
    LayoutDashboard,
    Merge,
    ShieldCheck,
    Upload,
    Users,
    BookOpen,
    type LucideIcon,
} from 'lucide-react';

export interface Route {
    title: string;
    url: string;
    icon: LucideIcon;
    /** Match nested paths too, e.g. /dashboard/course/12 under Courses. */
    match?: string[];
}

export interface RouteGroup {
    label: string;
    items: Route[];
}

export const routeGroups: RouteGroup[] = [
    {
        label: 'Overview',
        items: [
            {
                title: 'Dashboard',
                url: '/dashboard',
                icon: LayoutDashboard,
            },
        ],
    },
    {
        label: 'Records',
        items: [
            {
                title: 'Students',
                url: '/dashboard/search',
                icon: Users,
                match: ['/dashboard/student'],
            },
            {
                title: 'Courses',
                url: '/dashboard/courses',
                icon: BookOpen,
                match: ['/dashboard/course'],
            },
        ],
    },
    {
        label: 'Manage',
        items: [
            {
                title: 'Import a sheet',
                url: '/dashboard/import',
                icon: Upload,
            },
            {
                title: 'Merge students',
                url: '/dashboard/merge',
                icon: Merge,
            },
            {
                title: 'Approvals',
                url: '/dashboard/approvals',
                icon: ShieldCheck,
            },
        ],
    },
];

export const routes: Route[] = routeGroups.flatMap((group) => group.items);

export function isRouteActive(route: Route, pathname: string): boolean {
    if (pathname === route.url) return true;
    // The dashboard root would otherwise light up on every nested page.
    if (route.url !== '/dashboard' && pathname.startsWith(`${route.url}/`)) {
        return true;
    }
    return (route.match ?? []).some((prefix) => pathname.startsWith(prefix));
}

export function routeTitleFor(pathname: string): string {
    const match = routes.find((route) => isRouteActive(route, pathname));
    return match?.title ?? 'Dashboard';
}
