import fs from 'node:fs';
import path from 'node:path';

import type {
    AppUser,
    AttendanceRecord,
    Course,
    Student,
} from '@/lib/types';

import seed from './seed.json';

export interface StoreShape {
    students: Student[];
    classes: Course[];
    attendance: AttendanceRecord[];
    users: AppUser[];
}

const DATA_DIR = path.join(process.cwd(), '.dev-data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

function freshFromSeed(): StoreShape {
    // Deep copy so mutations never reach back into the imported module.
    return JSON.parse(JSON.stringify(seed)) as StoreShape;
}

function load(): StoreShape {
    try {
        if (fs.existsSync(STORE_FILE)) {
            const raw = fs.readFileSync(STORE_FILE, 'utf8');
            const parsed = JSON.parse(raw) as Partial<StoreShape>;
            if (Array.isArray(parsed.students) && Array.isArray(parsed.classes)) {
                return {
                    students: parsed.students,
                    classes: parsed.classes ?? [],
                    attendance: parsed.attendance ?? [],
                    users: parsed.users ?? [],
                };
            }
        }
    } catch (error) {
        console.warn(
            '[mock-store] could not read .dev-data/store.json, reseeding.',
            error,
        );
    }

    const fresh = freshFromSeed();
    persist(fresh);
    return fresh;
}

function persist(store: StoreShape): void {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
    } catch (error) {
        console.error('[mock-store] failed to persist store', error);
    }
}

// Next reloads modules on edit in dev; hang the singleton off globalThis so the
// in-memory copy does not diverge from what is on disk after a hot reload.
const globalRef = globalThis as typeof globalThis & {
    __studentManagerStore?: StoreShape;
};

export function getStore(): StoreShape {
    if (!globalRef.__studentManagerStore) {
        globalRef.__studentManagerStore = load();
    }
    return globalRef.__studentManagerStore;
}

export function commit(): void {
    if (globalRef.__studentManagerStore) {
        persist(globalRef.__studentManagerStore);
    }
}

export function resetStore(): StoreShape {
    globalRef.__studentManagerStore = freshFromSeed();
    persist(globalRef.__studentManagerStore);
    return globalRef.__studentManagerStore;
}

export function nextId(rows: { id: number }[]): number {
    return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}
