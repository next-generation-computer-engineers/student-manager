'use client';

import { usePathname } from 'next/navigation';

import { routeTitleFor } from '@/lib/routes';

export function BreadcrumbTitle() {
    const pathname = usePathname();
    return (
        <span className="text-sm font-medium text-muted-foreground">
            {routeTitleFor(pathname)}
        </span>
    );
}
