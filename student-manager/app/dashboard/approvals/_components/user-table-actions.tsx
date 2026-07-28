'use client';

import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { setUserFlagsAction } from '@/app/dashboard/actions';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AppUser } from '@/lib/types';

export const UserTableActions = ({
    user,
    isSelf,
}: {
    user: AppUser;
    isSelf: boolean;
}) => {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const apply = (
        patch: { approved?: boolean; admin?: boolean },
        successMessage: string,
    ) => {
        startTransition(async () => {
            const result = await setUserFlagsAction(user.id, patch);
            if (!result.ok) {
                toast.error(result.error ?? 'Update failed.');
                return;
            }
            toast.success(successMessage);
            router.refresh();
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="size-8 p-0"
                    disabled={pending}
                >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {user.approved ? (
                    <DropdownMenuItem
                        disabled={isSelf}
                        onClick={() =>
                            apply({ approved: false }, 'Access revoked.')
                        }
                    >
                        Revoke access
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem
                        onClick={() =>
                            apply({ approved: true }, 'User approved.')
                        }
                    >
                        Approve user
                    </DropdownMenuItem>
                )}

                {user.admin ? (
                    <DropdownMenuItem
                        disabled={isSelf}
                        onClick={() =>
                            apply({ admin: false }, 'Admin rights removed.')
                        }
                    >
                        Remove admin
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem
                        onClick={() =>
                            apply(
                                { admin: true, approved: true },
                                'User is now an admin.',
                            )
                        }
                    >
                        Make admin
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
