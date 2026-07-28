'use client';

import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const OPTIONS = ['10', '25', '50', '100'];

export const LimitFilter = ({
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
            <Select
                defaultValue={defaultValue || '10'}
                onValueChange={onChange}
            >
                <SelectTrigger id={`filter-${name}`} className="w-full">
                    <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                    {OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option} results
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};
