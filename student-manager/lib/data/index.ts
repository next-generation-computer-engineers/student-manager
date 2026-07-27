import { isMockMode } from '@/lib/config';

import { MockProvider } from './mock/provider';
import type { DataProvider } from './provider';
import { SupabaseProvider } from './supabase/provider';

let provider: DataProvider | null = null;

/**
 * Server-only. Every read and write in the app goes through this so the choice
 * of backend lives in exactly one place.
 */
export function getDataProvider(): DataProvider {
    if (!provider) {
        provider = isMockMode ? new MockProvider() : new SupabaseProvider();
    }
    return provider;
}

export type { CourseQuery, DataProvider, Overview, StudentQuery } from './provider';
