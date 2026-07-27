import type { AttendedStatus, Level } from '@/lib/types';

export type IssueLevel = 'error' | 'warning';

export interface Issue {
    level: IssueLevel;
    message: string;
    /** 1-based row number in the source sheet, when the issue is row-scoped. */
    row?: number;
    column?: string;
}

/** Which spreadsheet column supplies each field. -1 means "not present". */
export interface ColumnMapping {
    name: number;
    grade: number;
    level: number;
    parentCells: number;
    parentEmails: number;
    /** Column indexes holding one session each, aligned with `dates`. */
    sessions: number[];
}

export interface ParsedStudentRow {
    /** 1-based row number in the source sheet, for error reporting. */
    row: number;
    name: string;
    grade: number | null;
    level: Level | null;
    parent_cells: string[];
    parent_emails: string[];
    attended_statuses: AttendedStatus[];
    issues: Issue[];
}

export interface ParsedSheet {
    sourceName: string;
    courseName: string;
    /** ISO yyyy-mm-dd, one per session. */
    dates: string[];
    mapping: ColumnMapping;
    students: ParsedStudentRow[];
    issues: Issue[];
    /** Raw grid retained so the UI can offer a re-map without a re-upload. */
    headerRowIndex: number;
}

export interface ImportSummary {
    courseId: number;
    courseName: string;
    studentsCreated: number;
    studentsMatched: number;
    attendanceRows: number;
}
