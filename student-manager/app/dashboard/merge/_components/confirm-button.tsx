'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { mergeStudentsAction } from '@/app/dashboard/actions';

export const ConfirmButton = ({
    selected1,
    selected2,
    name1,
    name2,
}: {
    selected1?: number;
    selected2?: number;
    name1?: string;
    name2?: string;
}) => {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [dismissed, setDismissed] = useState(false);
    const pairKey = `${selected1}-${selected2}`;
    const lastPair = useRef(pairKey);

    // Re-arm the prompt whenever a different pair is picked.
    useEffect(() => {
        if (lastPair.current !== pairKey) {
            lastPair.current = pairKey;
            setDismissed(false);
        }
    }, [pairKey]);

    if (!selected1 || !selected2 || dismissed) return null;

    const sameStudent = selected1 === selected2;

    const confirm = () => {
        startTransition(async () => {
            const result = await mergeStudentsAction(selected1, selected2);
            if (!result.ok) {
                toast.error(result.error ?? 'Merge failed.');
                return;
            }
            toast.success(
                name2 && name1
                    ? `Merged ${name2} into ${name1}.`
                    : 'Students merged.',
            );
            router.replace('/dashboard/merge');
            router.refresh();
        });
    };

    return (
        <div className="sticky top-16 z-10 flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/8 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
                <p className="font-medium">
                    {sameStudent
                        ? 'Pick two different students'
                        : 'Ready to merge'}
                </p>
                <p className="text-muted-foreground">
                    {sameStudent
                        ? 'The same student is selected on both sides.'
                        : `${name2 ?? 'The second student'} will be absorbed into ${
                              name1 ?? 'the first student'
                          }. This cannot be undone.`}
                </p>
            </div>

            <div className="flex shrink-0 gap-2">
                <Button
                    variant="ghost"
                    onClick={() => setDismissed(true)}
                    disabled={pending}
                >
                    Cancel
                </Button>
                <Button onClick={confirm} disabled={pending || sameStudent}>
                    {pending ? 'Merging…' : 'Confirm merge'}
                </Button>
            </div>
        </div>
    );
};
