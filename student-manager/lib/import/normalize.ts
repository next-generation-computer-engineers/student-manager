import type { AttendedStatus, Level } from '@/lib/types';

export type CellValue = string | number | boolean | Date | null | undefined;

export function cellToString(value: CellValue): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
        // exceljs yields objects for formulas, hyperlinks and rich text.
        const rich = value as {
            text?: string;
            result?: CellValue;
            richText?: { text: string }[];
            hyperlink?: string;
        };
        if (Array.isArray(rich.richText)) {
            return rich.richText.map((part) => part.text).join('');
        }
        if (rich.text !== undefined) return String(rich.text);
        if (rich.result !== undefined) return cellToString(rich.result);
        return '';
    }
    return String(value).trim();
}

export function isBlank(value: CellValue): boolean {
    return cellToString(value).trim() === '';
}

/**
 * Grades arrive as "8", "8th", "Grade 8", "K". Mirrors the original script:
 * read the leading digit(s) and give up rather than guess on anything else.
 */
export function parseGrade(value: CellValue): number | null {
    const raw = cellToString(value).trim().toLowerCase();
    if (raw === '') return null;
    const match = raw.match(/\d+/);
    if (!match) return null;
    const grade = Number.parseInt(match[0], 10);
    if (Number.isNaN(grade) || grade < 0 || grade > 13) return null;
    return grade;
}

export function parseLevel(value: CellValue): Level | null {
    const raw = cellToString(value).trim().toLowerCase();
    if (raw === '') return null;
    if (raw.startsWith('beg')) return 'beginner';
    if (raw.startsWith('int')) return 'intermediate';
    if (raw.startsWith('adv')) return 'advanced';
    return null;
}

/**
 * A blank cell means the student was not marked in, which the original script
 * treated as absent. Unknown values return null so the caller can surface a
 * warning instead of aborting the whole import the way the script did.
 */
export function parseAttendedStatus(value: CellValue): AttendedStatus | null {
    const raw = cellToString(value).trim().toLowerCase();
    if (raw === '') return 'absent';
    if (raw.startsWith('in') || raw.startsWith('p') || raw === 'y') {
        return 'present';
    }
    if (
        raw.startsWith('out') ||
        raw.startsWith('abs') ||
        raw.startsWith('no') ||
        raw === 'a' ||
        raw === 'n'
    ) {
        return 'absent';
    }
    if (raw.startsWith('exc') || raw === 'e') return 'excused';
    if (raw.startsWith('late') || raw.startsWith('tard') || raw === 'l') {
        return 'late';
    }
    return null;
}

const PHONE_SEPARATORS = /[;,/]|\s{2,}/;

/** Shortest real phone number is 7 digits; below that it is a grade or an id. */
const MIN_PHONE_DIGITS = 7;

function digitCount(value: string): number {
    return (value.match(/\d/g) ?? []).length;
}

export function looksLikePhone(value: CellValue): boolean {
    const raw = cellToString(value).trim();
    if (raw === '' || raw.includes('@')) return false;
    return digitCount(raw) >= MIN_PHONE_DIGITS;
}

export function parsePhoneList(value: CellValue): string[] {
    const raw = cellToString(value).trim();
    if (raw === '') return [];
    return raw
        .split(PHONE_SEPARATORS)
        .map((part) => part.trim())
        .filter((part) => digitCount(part) >= MIN_PHONE_DIGITS);
}

export function parseEmailList(value: CellValue): string[] {
    const raw = cellToString(value).trim();
    if (raw === '') return [];
    return raw
        .split(/[;,\s]+/)
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.includes('@'));
}

/** CENG teachers and managers appear on attendance sheets with this domain. */
export const CENG_STAFF_EMAIL_DOMAIN = '@cengclass.org';

export function isCengStaffEmail(email: string): boolean {
    return email.trim().toLowerCase().endsWith(CENG_STAFF_EMAIL_DOMAIN);
}

export function hasCengStaffEmail(emails: string[]): boolean {
    return emails.some(isCengStaffEmail);
}

export function titleCaseName(value: CellValue): string {
    return cellToString(value)
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map((word) =>
            word.length === 0
                ? word
                : word[0].toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(' ');
}

/**
 * Excel serial dates count days from 1899-12-30. Only accept the 1970-2069
 * window: without a floor, small integers like a grade of 8 would read as
 * dates in 1900 and get mistaken for session columns.
 */
const SERIAL_MIN = 25569; // 1970-01-01
const SERIAL_MAX = 61757; // 2069-01-01

function excelSerialToDate(serial: number): Date | null {
    if (!Number.isFinite(serial)) return null;
    if (serial < SERIAL_MIN || serial > SERIAL_MAX) return null;
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDay(date: Date): string {
    // Format from UTC parts so a date-only value cannot slip a day backwards
    // in negative-offset timezones.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Returns an ISO yyyy-mm-dd string, or null if the cell is not a date. */
export function parseSheetDate(value: CellValue): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : toIsoDay(value);
    }
    if (typeof value === 'number') {
        const fromSerial = excelSerialToDate(value);
        return fromSerial ? toIsoDay(fromSerial) : null;
    }

    const raw = cellToString(value).trim();
    if (raw === '') return null;

    // Already ISO.
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    // US-style m/d/yy or m/d/yyyy, the common spreadsheet default.
    const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (slash) {
        const month = Number(slash[1]);
        const day = Number(slash[2]);
        let year = Number(slash[3]);
        if (year < 100) year += year < 70 ? 2000 : 1900;
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        return null;
    }

    // Textual forms such as "Jun 22" or "June 22, 2025". Matched explicitly
    // rather than handed to `new Date`, which is lenient enough to turn a title
    // like "Python Summer Session 1" into 2001-01-01.
    return parseTextualDate(raw);
}

const MONTHS = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
];
const MONTH_GROUP = MONTHS.join('|');
const MONTH_FIRST = new RegExp(
    `^(${MONTH_GROUP})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{2,4}))?$`,
    'i',
);
const DAY_FIRST = new RegExp(
    `^(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_GROUP})[a-z]*\\.?(?:[,\\s]+(\\d{2,4}))?$`,
    'i',
);

function buildDate(
    monthName: string,
    day: number,
    yearRaw: string | undefined,
): string | null {
    const month = MONTHS.indexOf(monthName.slice(0, 3).toLowerCase());
    if (month === -1 || day < 1 || day > 31) return null;

    let year: number;
    if (yearRaw === undefined) {
        // Undated column headers ("Jun 22") are common; assume the current year
        // and let the import preview surface the resolved dates for review.
        year = new Date().getUTCFullYear();
    } else {
        year = Number(yearRaw);
        if (year < 100) year += year < 70 ? 2000 : 1900;
    }

    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
    return toIsoDay(date);
}

function parseTextualDate(raw: string): string | null {
    const monthFirst = raw.match(MONTH_FIRST);
    if (monthFirst) {
        return buildDate(monthFirst[1], Number(monthFirst[2]), monthFirst[3]);
    }

    const dayFirst = raw.match(DAY_FIRST);
    if (dayFirst) {
        return buildDate(dayFirst[2], Number(dayFirst[1]), dayFirst[3]);
    }

    return null;
}
