import type { AttendedStatus } from '@/lib/types';

import {
    cellToString,
    hasCengStaffEmail,
    isBlank,
    looksLikePhone,
    parseAttendedStatus,
    parseEmailList,
    parseGrade,
    parseLevel,
    parsePhoneList,
    parseSheetDate,
    titleCaseName,
    type CellValue,
} from './normalize';
import type {
    ColumnMapping,
    Issue,
    ParsedSheet,
    ParsedStudentRow,
} from './types';
import type { SheetGrid } from './read-workbook';

const HEADER_SEARCH_DEPTH = 25;

const LABEL_PATTERNS: { field: keyof Omit<ColumnMapping, 'sessions'>; re: RegExp }[] =
    [
        { field: 'name', re: /\b(student|full)?\s*name\b/i },
        { field: 'grade', re: /\b(grade|year|gr\.?)\b/i },
        { field: 'level', re: /\b(level|tier|track)\b/i },
        { field: 'parentCells', re: /(cell|phone|mobile|contact\s*number)/i },
        { field: 'parentEmails', re: /(e-?mail)/i },
    ];

/** The layout the original process_data.py assumed, used when labels are absent. */
const POSITIONAL_FALLBACK: Omit<ColumnMapping, 'sessions'> = {
    name: 1,
    grade: 2,
    level: 3,
    parentCells: 4,
    parentEmails: 5,
};

function looksLikePersonName(value: CellValue): boolean {
    const raw = cellToString(value).trim();
    if (raw.length < 3 || raw.length > 60) return false;
    if (/@/.test(raw)) return false;
    if (/^\d+$/.test(raw)) return false;
    return /^[a-z][a-z'`.-]*(\s+[a-z'`.-]+)+$/i.test(raw);
}

/**
 * The session-date row doubles as the header. Pick whichever of the first rows
 * yields the most parseable dates.
 */
function findHeaderRow(rows: CellValue[][]): number {
    let bestRow = -1;
    let bestCount = 0;

    const depth = Math.min(rows.length, HEADER_SEARCH_DEPTH);
    for (let r = 0; r < depth; r += 1) {
        const count = rows[r].filter(
            (cell) => parseSheetDate(cell) !== null,
        ).length;
        if (count > bestCount) {
            bestCount = count;
            bestRow = r;
        }
    }

    if (bestRow !== -1) return bestRow;

    // No dates anywhere: fall back to the first row with any content, so a
    // roster-only sheet (no attendance columns) still imports.
    return rows.findIndex((row) => row.some((cell) => !isBlank(cell)));
}

function detectMapping(
    rows: CellValue[][],
    headerRowIndex: number,
    sessionColumns: number[],
): { mapping: ColumnMapping; issues: Issue[] } {
    const issues: Issue[] = [];
    const header = rows[headerRowIndex] ?? [];
    const firstSession = sessionColumns.length
        ? Math.min(...sessionColumns)
        : header.length;

    const fields: Omit<ColumnMapping, 'sessions'> = {
        name: -1,
        grade: -1,
        level: -1,
        parentCells: -1,
        parentEmails: -1,
    };

    // Pass 1: match on header labels.
    const taken = new Set<number>();
    for (let c = 0; c < firstSession; c += 1) {
        const label = cellToString(header[c]);
        if (label === '') continue;
        for (const { field, re } of LABEL_PATTERNS) {
            if (fields[field] === -1 && !taken.has(c) && re.test(label)) {
                fields[field] = c;
                taken.add(c);
                break;
            }
        }
    }

    const dataRows = rows.slice(headerRowIndex + 1);
    const populated = dataRows.filter((row) =>
        row.some((cell) => !isBlank(cell)),
    );

    /** Assign the unclaimed column whose cells most often satisfy `predicate`. */
    const claimBestBy = (
        field: keyof typeof fields,
        predicate: (cell: CellValue) => boolean,
        minShare = 0.25,
    ) => {
        if (fields[field] !== -1) return;

        let bestColumn = -1;
        let bestScore = 0;
        for (let c = 0; c < firstSession; c += 1) {
            if (taken.has(c)) continue;
            const score = populated.filter((row) => predicate(row[c])).length;
            if (score > bestScore) {
                bestScore = score;
                bestColumn = c;
            }
        }

        const threshold = Math.max(1, Math.floor(populated.length * minShare));
        if (bestColumn !== -1 && bestScore >= threshold) {
            fields[field] = bestColumn;
            taken.add(bestColumn);
        }
    };

    // Pass 2: infer each unlabelled field from the shape of its data. Ordered
    // most to least distinctive so the strong signals claim their column first.
    claimBestBy('name', looksLikePersonName);
    claimBestBy('parentEmails', (cell) => parseEmailList(cell).length > 0);
    claimBestBy('parentCells', looksLikePhone);
    claimBestBy('level', (cell) => parseLevel(cell) !== null);
    claimBestBy(
        'grade',
        (cell) => !isBlank(cell) && parseGrade(cell) !== null,
    );

    // Pass 3: nothing identifiable at all, so assume the layout the original
    // script hardcoded.
    const foundAny = Object.values(fields).some((column) => column !== -1);
    if (!foundAny && firstSession > POSITIONAL_FALLBACK.name) {
        for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
            const column = POSITIONAL_FALLBACK[key];
            if (column < firstSession) fields[key] = column;
        }
        issues.push({
            level: 'warning',
            message:
                'No column headers were recognised, so the standard layout ' +
                '(name, grade, level, parent cell, parent email) was assumed. ' +
                'Check the preview below and remap if needed.',
        });
    }

    return { mapping: { ...fields, sessions: sessionColumns }, issues };
}

export interface ParseOptions {
    /** Overrides from the preview UI; anything omitted keeps the detected value. */
    mapping?: Partial<ColumnMapping>;
    courseName?: string;
}

export function parseSheet(
    grid: SheetGrid,
    sourceName: string,
    options: ParseOptions = {},
): ParsedSheet {
    const { rows } = grid;
    const issues: Issue[] = [];

    if (rows.length === 0) {
        return {
            sourceName,
            courseName: options.courseName ?? '',
            dates: [],
            mapping: {
                name: -1,
                grade: -1,
                level: -1,
                parentCells: -1,
                parentEmails: -1,
                sessions: [],
            },
            students: [],
            issues: [{ level: 'error', message: 'That file is empty.' }],
            headerRowIndex: -1,
        };
    }

    const headerRowIndex = findHeaderRow(rows);
    if (headerRowIndex === -1) {
        return {
            sourceName,
            courseName: options.courseName ?? '',
            dates: [],
            mapping: {
                name: -1,
                grade: -1,
                level: -1,
                parentCells: -1,
                parentEmails: -1,
                sessions: [],
            },
            students: [],
            issues: [
                { level: 'error', message: 'That file has no readable rows.' },
            ],
            headerRowIndex: -1,
        };
    }

    const header = rows[headerRowIndex];

    const detectedSessions: number[] = [];
    const dates: string[] = [];
    header.forEach((cell, index) => {
        const date = parseSheetDate(cell);
        if (date !== null) {
            detectedSessions.push(index);
            dates.push(date);
        }
    });

    const detection = detectMapping(rows, headerRowIndex, detectedSessions);
    issues.push(...detection.issues);

    const mapping: ColumnMapping = {
        ...detection.mapping,
        ...options.mapping,
        sessions: options.mapping?.sessions ?? detection.mapping.sessions,
    };

    // Keep dates aligned if the caller narrowed the session columns.
    const sessionDates = mapping.sessions.map((column) => {
        const index = detectedSessions.indexOf(column);
        return index === -1
            ? (parseSheetDate(header[column]) ?? '')
            : dates[index];
    });

    if (mapping.sessions.length === 0) {
        issues.push({
            level: 'warning',
            message:
                'No session date columns were found, so students will be ' +
                'imported with an empty attendance record.',
        });
    }

    const seenDates = new Map<string, number>();
    sessionDates.forEach((date) => {
        seenDates.set(date, (seenDates.get(date) ?? 0) + 1);
    });
    for (const [date, count] of seenDates) {
        if (count > 1 && date !== '') {
            issues.push({
                level: 'warning',
                message: `The date ${date} appears in ${count} columns. Both sessions will be kept.`,
            });
        }
    }

    // Course name: the leading non-date label on the header row, as the
    // original script did with cell A1.
    let courseName = options.courseName ?? '';
    if (courseName === '') {
        const firstSession = mapping.sessions.length
            ? Math.min(...mapping.sessions)
            : header.length;
        for (let c = 0; c < firstSession; c += 1) {
            const text = cellToString(header[c]).trim();
            const isFieldLabel = LABEL_PATTERNS.some((p) => p.re.test(text));
            if (text !== '' && !isFieldLabel) {
                courseName = text;
                break;
            }
        }
    }
    if (courseName === '') {
        courseName = sourceName.replace(/\.[^.]+$/, '');
        issues.push({
            level: 'warning',
            message: `No course name was found in the sheet, so the file name "${courseName}" was used.`,
        });
    }

    if (mapping.name === -1) {
        issues.push({
            level: 'error',
            message:
                'No student name column could be identified. Pick one in the ' +
                'column mapping above.',
        });
    }

    const students: ParsedStudentRow[] = [];
    const seenNames = new Map<string, number>();
    const skippedStaff: string[] = [];

    for (let r = headerRowIndex + 1; r < rows.length; r += 1) {
        const row = rows[r];
        const rowNumber = r + 1;

        if (row.every((cell) => isBlank(cell))) continue;

        const name = mapping.name === -1 ? '' : titleCaseName(row[mapping.name]);
        if (name === '') continue;

        const parent_emails =
            mapping.parentEmails === -1
                ? []
                : parseEmailList(row[mapping.parentEmails]);

        // Teachers and managers for CENG appear on the roster with this domain;
        // they are not students and must not be imported.
        if (hasCengStaffEmail(parent_emails)) {
            skippedStaff.push(name);
            continue;
        }

        const rowIssues: Issue[] = [];

        const gradeRaw = mapping.grade === -1 ? null : row[mapping.grade];
        const grade = parseGrade(gradeRaw);
        if (grade === null && !isBlank(gradeRaw)) {
            rowIssues.push({
                level: 'warning',
                row: rowNumber,
                message: `Could not read grade "${cellToString(gradeRaw)}" for ${name}; left blank.`,
            });
        }

        const levelRaw = mapping.level === -1 ? null : row[mapping.level];
        const level = parseLevel(levelRaw);
        if (level === null && !isBlank(levelRaw)) {
            rowIssues.push({
                level: 'warning',
                row: rowNumber,
                message: `Unrecognised level "${cellToString(levelRaw)}" for ${name}; left blank.`,
            });
        }

        const attended_statuses: AttendedStatus[] = [];
        mapping.sessions.forEach((column, sessionIndex) => {
            const raw = row[column];
            const status = parseAttendedStatus(raw);
            if (status === null) {
                // The original script called exit(1) here, which meant one odd
                // cell threw away the whole file. Record it and carry on.
                rowIssues.push({
                    level: 'warning',
                    row: rowNumber,
                    message:
                        `Unrecognised attendance value "${cellToString(raw)}" for ` +
                        `${name} on ${sessionDates[sessionIndex] || `session ${sessionIndex + 1}`}; ` +
                        'counted as absent.',
                });
                attended_statuses.push('absent');
            } else {
                attended_statuses.push(status);
            }
        });

        const previous = seenNames.get(name.toLowerCase());
        if (previous !== undefined) {
            rowIssues.push({
                level: 'warning',
                row: rowNumber,
                message: `${name} also appears on row ${previous}. Both rows will be imported; use the Merge tool afterwards if they are the same person.`,
            });
        } else {
            seenNames.set(name.toLowerCase(), rowNumber);
        }

        students.push({
            row: rowNumber,
            name,
            grade,
            level,
            parent_cells:
                mapping.parentCells === -1
                    ? []
                    : parsePhoneList(row[mapping.parentCells]),
            parent_emails,
            attended_statuses,
            issues: rowIssues,
        });
    }

    if (skippedStaff.length > 0) {
        const preview = skippedStaff.slice(0, 5).join(', ');
        const more =
            skippedStaff.length > 5
                ? ` and ${skippedStaff.length - 5} more`
                : '';
        issues.push({
            level: 'warning',
            message:
                `Skipped ${skippedStaff.length} CENG staff row${
                    skippedStaff.length === 1 ? '' : 's'
                } (@cengclass.org): ${preview}${more}.`,
        });
    }

    if (students.length === 0) {
        issues.push({
            level: 'error',
            message: 'No student rows were found beneath the header row.',
        });
    }

    return {
        sourceName,
        courseName,
        dates: sessionDates,
        mapping,
        students,
        issues,
        headerRowIndex,
    };
}
