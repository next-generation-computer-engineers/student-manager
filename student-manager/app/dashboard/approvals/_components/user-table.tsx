import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { AppUser } from '@/lib/types';
import { cn } from '@/lib/utils';

import { UserTableActions } from './user-table-actions';

const censorEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (!domain || localPart.length <= 2) return email;
    return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart.at(-1)}@${domain}`;
};

type Filter = 'awaitingApproval' | 'admin' | 'all';

function statusOf(user: AppUser) {
    if (user.admin) return { label: 'Admin', className: 'bg-primary/12 text-primary ring-primary/25' };
    if (user.approved) {
        return {
            label: 'Approved',
            className: 'bg-present/12 text-present ring-present/25',
        };
    }
    return {
        label: 'Awaiting approval',
        className: 'bg-late/15 text-late ring-late/30',
    };
}

export const UserTable = ({
    users,
    filter,
    actionsEnabled,
    currentUserId,
}: {
    users: AppUser[];
    filter: Filter;
    actionsEnabled: boolean;
    currentUserId?: string;
}) => {
    const rows = users.filter((user) => {
        if (filter === 'all') return true;
        if (filter === 'awaitingApproval') return !user.approved && !user.admin;
        if (filter === 'admin') return user.admin;
        return false;
    });

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Status</TableHead>
                        {actionsEnabled && (
                            <TableHead className="w-12 text-right">
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={actionsEnabled ? 4 : 3}
                                className="h-24 text-center text-sm text-muted-foreground"
                            >
                                No users in this view.
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((user) => {
                            const status = statusOf(user);
                            const isSelf = user.id === currentUserId;
                            return (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        {actionsEnabled
                                            ? user.email
                                            : censorEmail(user.email)}
                                        {isSelf && (
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                (you)
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(
                                            user.created_at,
                                        ).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={cn(
                                                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                                                status.className,
                                            )}
                                        >
                                            {status.label}
                                        </span>
                                    </TableCell>
                                    {actionsEnabled && (
                                        <TableCell className="text-right">
                                            <UserTableActions
                                                user={user}
                                                isSelf={isSelf}
                                            />
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
