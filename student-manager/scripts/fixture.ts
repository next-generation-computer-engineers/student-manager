/**
 * Builds a workbook shaped exactly like the ones process_data.py consumed:
 * course name in A1, session dates from column G, no header labels, and a
 * deliberate mix of messy values.
 */
import ExcelJS from 'exceljs';

export const SESSIONS = [
    '2026-07-06',
    '2026-07-07',
    '2026-07-08',
    '2026-07-09',
    '2026-07-10',
];

export const COURSE_NAME = 'Robotics Summer Session 3';

const STUDENTS: [string, string, string, string, string, string[]][] = [
    ['ada lovelace', '7th', 'Beginner', '555-0100', 'ada@example.com',
        ['In', 'In', 'Out', 'Late', 'In']],
    ['ALAN TURING', '9', 'adv', '555-0101', 'alan@example.com',
        ['in', 'excused', '', 'in', 'in']],
    ['grace hopper', 'Grade 6', 'intermediate', '555-0102; 555-0112',
        'grace@example.com, g.hopper@example.com',
        ['In', 'In', 'In', 'In', 'In']],
    ['katherine johnson', '8', 'beg', '555-0103', 'kj@example.com',
        ['absent', 'in', 'in', 'maybe?', 'in']],
    ['radia perlman', '10', 'Advanced', '', '',
        ['in', 'in', 'late', 'in', 'out']],
];

export const STUDENT_COUNT = STUDENTS.length;

export async function buildRosterWorkbook(): Promise<ArrayBuffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');

    sheet.addRow([
        COURSE_NAME,
        '',
        '',
        '',
        '',
        '',
        ...SESSIONS.map((date) => new Date(`${date}T00:00:00Z`)),
    ]);

    for (const [name, grade, level, cells, emails, statuses] of STUDENTS) {
        sheet.addRow(['', name, grade, level, cells, emails, ...statuses]);
    }

    return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}
