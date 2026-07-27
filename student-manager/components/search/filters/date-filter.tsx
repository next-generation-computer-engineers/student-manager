'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const DateFilter = ({
    onChange,
    defaultValue,
    name,
    text,
}: {
    onChange: (value: string) => void;
    defaultValue: string;
    name: string;
    text: string;
}) => {
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={`filter-${name}`}>{text}</Label>
            <Input
                id={`filter-${name}`}
                type="date"
                defaultValue={defaultValue}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
};
