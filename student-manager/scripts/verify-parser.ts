/**
 * Exercises the sheet parser against fixtures shaped like the workbooks the old
 * process_data.py consumed, plus messier variants it would have crashed on.
 *
 *   npx tsx scripts/verify-parser.ts
 */
import ExcelJS from 'exceljs';

import { parseSheet } from '../lib/import/parse-sheet';
import { readWorkbook } from '../lib/import/read-workbook';

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a === b) {
        console.log(`  ok   ${label}`);
    } else {
        failures += 1;
        console.log(`  FAIL ${label}\n         expected ${b}\n         actual   ${a}`);
    }
}

async function toBuffer(rows: unknown[][]): Promise<ArrayBuffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');
    rows.forEach((row) => sheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ArrayBuffer;
}

async function parseRows(rows: unknown[][], filename = 'fixture.xlsx') {
    const grid = await readWorkbook(await toBuffer(rows), filename);
    return parseSheet(grid, filename);
}

async function main() {
    // 1. The exact layout process_data.py assumed: A1 = class name, dates from
    //    column G, no header labels at all.
    console.log('\n[1] original process_data.py layout');
    {
        const d = (s: string) => new Date(`${s}T00:00:00Z`);
        const sheet = await parseRows([
            [
                'Python Summer Session 1',
                '',
                '',
                '',
                '',
                '',
                d('2025-06-02'),
                d('2025-06-03'),
                d('2025-06-04'),
            ],
            [
                '',
                'ada lovelace',
                '7th',
                'Beginner',
                '555-0100',
                'ada@example.com',
                'In',
                'Out',
                'Late',
            ],
            [
                '',
                'ALAN TURING',
                '9',
                'adv',
                '555-0101',
                'alan@example.com',
                'in',
                'excused',
                '',
            ],
        ]);

        check('course name', sheet.courseName, 'Python Summer Session 1');
        check('dates', sheet.dates, ['2025-06-02', '2025-06-03', '2025-06-04']);
        check('student count', sheet.students.length, 2);
        check('name title-cased', sheet.students[0].name, 'Ada Lovelace');
        check('grade from "7th"', sheet.students[0].grade, 7);
        check('level from "Beginner"', sheet.students[0].level, 'beginner');
        check('phones', sheet.students[0].parent_cells, ['555-0100']);
        check('emails', sheet.students[0].parent_emails, ['ada@example.com']);
        check('statuses row 1', sheet.students[0].attended_statuses, [
            'present',
            'absent',
            'late',
        ]);
        check('level from "adv"', sheet.students[1].level, 'advanced');
        check('blank cell counts absent', sheet.students[1].attended_statuses, [
            'present',
            'excused',
            'absent',
        ]);
        check('no errors', sheet.issues.filter((i) => i.level === 'error').length, 0);
    }

    // 2. Labelled headers in a different column order, with string dates.
    console.log('\n[2] labelled headers, reordered columns, string dates');
    {
        const sheet = await parseRows([
            [
                'Robotics Fall 2025',
                'Parent Email',
                'Student Name',
                'Level',
                'Grade',
                'Parent Cell',
                '9/5/2025',
                '9/12/2025',
            ],
            [
                '',
                'kay@example.com',
                'katherine johnson',
                'intermediate',
                'Grade 11',
                '555-0102',
                'present',
                'absent',
            ],
        ]);

        check('course name', sheet.courseName, 'Robotics Fall 2025');
        check('dates parsed from m/d/yyyy', sheet.dates, [
            '2025-09-05',
            '2025-09-12',
        ]);
        check('name column found by label', sheet.students[0].name, 'Katherine Johnson');
        check('grade from "Grade 11"', sheet.students[0].grade, 11);
        check('level', sheet.students[0].level, 'intermediate');
        check('email', sheet.students[0].parent_emails, ['kay@example.com']);
        check('statuses', sheet.students[0].attended_statuses, ['present', 'absent']);
    }

    // 3. Values the old script called exit(1) on must now warn, not abort.
    console.log('\n[3] unknown attendance value degrades to a warning');
    {
        const sheet = await parseRows([
            ['Art Club', '', '', '', '', '', '2025-01-10'],
            ['', 'grace hopper', '5', 'beg', '', '', 'maybe?'],
        ]);

        check('still parsed a student', sheet.students.length, 1);
        check('unknown value became absent', sheet.students[0].attended_statuses, [
            'absent',
        ]);
        check('warning recorded', sheet.students[0].issues.length, 1);
        check(
            'warning is not fatal',
            sheet.issues.filter((i) => i.level === 'error').length,
            0,
        );
    }

    // 4. CSV input with multiple contacts in one cell.
    console.log('\n[4] CSV with multi-value contact cells');
    {
        const csv = [
            'Chess Spring,,,,,,2025-04-01,2025-04-08',
            ',jean bartik,6,Advanced,"555-0103; 555-0104","a@example.com, b@example.com",in,late',
        ].join('\n');
        const grid = await readWorkbook(
            new TextEncoder().encode(csv).buffer as ArrayBuffer,
            'roster.csv',
        );
        const sheet = parseSheet(grid, 'roster.csv');

        check('course name', sheet.courseName, 'Chess Spring');
        check('dates', sheet.dates, ['2025-04-01', '2025-04-08']);
        check('split phones', sheet.students[0].parent_cells, [
            '555-0103',
            '555-0104',
        ]);
        check('split emails', sheet.students[0].parent_emails, [
            'a@example.com',
            'b@example.com',
        ]);
        check('statuses', sheet.students[0].attended_statuses, ['present', 'late']);
    }

    // 5. Duplicate names surface a warning rather than silently colliding.
    console.log('\n[5] duplicate student names');
    {
        const sheet = await parseRows([
            ['Dup Course', '', '', '', '', '', '2025-05-01'],
            ['', 'john smith', '4', 'beg', '', '', 'in'],
            ['', 'John  Smith', '4', 'beg', '', '', 'out'],
        ]);
        check('both rows kept', sheet.students.length, 2);
        check(
            'duplicate flagged',
            sheet.students[1].issues.some((i) => i.message.includes('also appears')),
            true,
        );
    }

    // 6. A sheet with no dates at all should still yield a roster.
    console.log('\n[6] roster-only sheet, no attendance columns');
    {
        const sheet = await parseRows([
            ['Waitlist', 'Student Name', 'Grade'],
            ['', 'radia perlman', '8'],
        ]);
        check('student parsed', sheet.students[0].name, 'Radia Perlman');
        check('no dates', sheet.dates, []);
        check('empty attendance', sheet.students[0].attended_statuses, []);
        check(
            'warned about missing sessions',
            sheet.issues.some((i) => i.message.includes('No session date')),
            true,
        );
    }

    // 7. CENG staff emails are teachers/managers — skip them on import.
    console.log('\n[7] @cengclass.org staff rows are skipped');
    {
        const sheet = await parseRows([
            ['Python Club', '', '', '', '', '', '2025-06-01'],
            ['', 'ada lovelace', '7', 'beg', '', 'ada@example.com', 'in'],
            ['', 'ceng teacher', '0', 'adv', '', 'teacher@cengclass.org', 'in'],
            [
                '',
                'mixed contact',
                '5',
                'beg',
                '',
                'parent@example.com; staff@cengclass.org',
                'in',
            ],
        ]);

        check('only the real student is kept', sheet.students.length, 1);
        check('kept student', sheet.students[0].name, 'Ada Lovelace');
        check(
            'staff skip is reported',
            sheet.issues.some((i) => i.message.includes('@cengclass.org')),
            true,
        );
        check(
            'both staff rows counted',
            sheet.issues.some((i) => i.message.includes('Skipped 2')),
            true,
        );
    }

    console.log(
        failures === 0
            ? '\nAll parser checks passed.\n'
            : `\n${failures} parser check(s) failed.\n`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
