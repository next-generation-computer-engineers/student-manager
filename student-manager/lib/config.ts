export type DataSource = 'mock' | 'supabase';

/**
 * Production default is Supabase. Mock is opt-in only for offline dev
 * (`NEXT_PUBLIC_DATA_SOURCE=mock`) and ships with an empty seed — not for normal use.
 */
export const DATA_SOURCE: DataSource =
    process.env.NEXT_PUBLIC_DATA_SOURCE === 'mock' ? 'mock' : 'supabase';

export const isMockMode = DATA_SOURCE === 'mock';
