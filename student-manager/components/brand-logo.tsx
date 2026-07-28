import Image from 'next/image';

import { cn } from '@/lib/utils';

type BrandLogoProps = {
    /** Full wordmark vs a square containing the whole logo. */
    variant?: 'full' | 'mark';
    className?: string;
    priority?: boolean;
};

/**
 * CENG brand mark. Artwork is transparent — no black plate behind it — so it
 * sits cleanly on both light and dark surfaces.
 */
export function BrandLogo({
    variant = 'full',
    className,
    priority = false,
}: BrandLogoProps) {
    if (variant === 'mark') {
        return (
            <span
                className={cn(
                    'relative inline-flex size-8 shrink-0 overflow-hidden',
                    className,
                )}
            >
                <Image
                    src="/ceng-mark.png"
                    alt="CENG"
                    width={411}
                    height={411}
                    className="size-full object-contain"
                    priority={priority}
                />
            </span>
        );
    }

    return (
        <span
            className={cn(
                'relative inline-flex h-8 w-fit max-w-full shrink-0',
                className,
            )}
        >
            <Image
                src="/ceng-logo.png"
                alt="CENG"
                width={1024}
                height={411}
                className="h-full w-auto max-w-full object-contain object-left"
                priority={priority}
            />
        </span>
    );
}
