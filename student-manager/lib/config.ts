export type DataSource = 'mock' | 'supabase';

/**
 * Production default is Supabase. Mock is opt-in only
 * (`NEXT_PUBLIC_DATA_SOURCE=mock`) for offline local work.
 */
export const DATA_SOURCE: DataSource =
    process.env.NEXT_PUBLIC_DATA_SOURCE === 'mock' ? 'mock' : 'supabase';

export const isMockMode = DATA_SOURCE === 'mock';
