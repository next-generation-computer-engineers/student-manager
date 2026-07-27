import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
    label,
    value,
    icon: Icon,
    hint,
    className,
}: {
    label: string;
    value: ReactNode;
    icon?: LucideIcon;
    hint?: ReactNode;
    className?: string;
}) {
    return (
        <Card className={cn('gap-0 py-4', className)}>
            <CardContent className="px-4">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    {Icon && <Icon className="size-4 text-muted-foreground" />}
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {value}
                </p>
                {hint && (
                    <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                )}
            </CardContent>
        </Card>
    );
}
