'use client';

import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { DateFilter } from './filters/date-filter';
import { LimitFilter } from './filters/limit-filter';

const allFilters = {
    date: { name: 'date', component: DateFilter },
    limit: { name: 'limit', component: LimitFilter },
};

export default function Search({
    name = 'query',
    placeholder,
    filters = [],
}: {
    name?: string;
    placeholder: string;
    filters?: { name: keyof typeof allFilters; id: string; text: string }[];
}) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [showFilters, setShowFilters] = React.useState(false);

    const activeFilterCount = filters.filter((filter) =>
        searchParams.get(filter.id),
    ).length;

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set(name, term);
        } else {
            params.delete(name);
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleFilterChange = (filterName: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set(filterName, value);
        } else {
            params.delete(filterName);
        }
        replace(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams);
        filters.forEach((filter) => params.delete(filter.id));
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <label htmlFor={`search-${name}`} className="sr-only">
                        {placeholder}
                    </label>
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id={`search-${name}`}
                        className="pl-9"
                        placeholder={placeholder}
                        defaultValue={searchParams.get(name)?.toString() ?? ''}
                        onChange={(event) => handleSearch(event.target.value)}
                    />
                </div>

                {filters.length > 0 && (
                    <Button
                        type="button"
                        variant={showFilters ? 'secondary' : 'outline'}
                        onClick={() => setShowFilters((open) => !open)}
                        aria-expanded={showFilters}
                    >
                        <SlidersHorizontal className="size-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-1 rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                )}
            </div>

            {showFilters && filters.length > 0 && (
                <div
                    className={cn(
                        'grid gap-4 rounded-lg border bg-card p-4',
                        'sm:grid-cols-2 lg:grid-cols-3',
                    )}
                >
                    {filters.map((filter) => {
                        const FilterComponent =
                            allFilters[filter.name]?.component;
                        if (!FilterComponent) return null;
                        return (
                            <FilterComponent
                                key={filter.id}
                                onChange={(value) =>
                                    handleFilterChange(filter.id, value)
                                }
                                defaultValue={searchParams.get(filter.id) || ''}
                                name={filter.id}
                                text={filter.text}
                            />
                        );
                    })}
                    {activeFilterCount > 0 && (
                        <div className="flex items-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                            >
                                <X className="size-4" />
                                Clear filters
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
