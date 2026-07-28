/**
 * Exercises the mock provider's write paths: importing a sheet, re-importing
 * the same sheet, and merging two student records.
 *
 *   npx tsx scripts/verify-store.ts
 */
import { MockProvider } from '../lib/data/mock/provider';
import { getStore, resetStore } from '../lib/data/mock/store';
import { parseSheet } from '../lib/import/parse-sheet';
import { readWorkbook } from '../lib/import/read-workbook';
import { buildRosterWorkbook } from './fixture';

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

async function main() {
    resetStore();
    const provider = new MockProvider();

    const before = getStore();
    const baseStudents = before.students.length;
    const baseClasses = before.classes.length;
    console.log(
        `\nseeded store: ${baseStudents} students, ${baseClasses} classes, ` +
            `${before.attendance.length} attendance rows`,
    );

    const grid = await readWorkbook(await buildRosterWorkbook(), 'roster.xlsx');
    const sheet = parseSheet(grid, 'roster.xlsx');

    console.log('\n[1] first import creates the course and its students');
    const first = await provider.importSheet(sheet);
    check('students created', first.studentsCreated, 5);
    check('students matched', first.studentsMatched, 0);
    check('attendance rows', first.attendanceRows, 5);
    check('course name', first.courseName, 'Robotics Summer Session 3');
    check(
        'store student count grew by 5',
        getStore().students.length,
        baseStudents + 5,
    );
    check(
        'store class count grew by 1',
        getStore().classes.length,
        baseClasses + 1,
    );

    console.log('\n[2] the imported course reads back correctly');
    const course = await provider.getCourse(first.courseId);
    check('course found', course?.name, 'Robotics Summer Session 3');
    check('start date', course?.start_date, '2026-07-06');
    check('end date', course?.end_date, '2026-07-10');
    const roster = await provider.getCourseRoster(first.courseId);
    check('roster size', roster.length, 5);
    check(
        'roster is alphabetical',
        roster.map((r) => r.student.name),
        [
            'Ada Lovelace',
            'Alan Turing',
            'Grace Hopper',
            'Katherine Johnson',
            'Radia Perlman',
        ],
    );
    check(
        'grace has both phone numbers',
        (await provider.listStudents({ query: 'Grace Hopper' }))[0]
            ?.parent_cells,
        ['555-0102', '555-0112'],
    );

    console.log('\n[3] re-importing matches students instead of duplicating');
    const second = await provider.importSheet(sheet);
    check('students created', second.studentsCreated, 0);
    check('students matched', second.studentsMatched, 5);
    check(
        'no new student rows',
        getStore().students.length,
        baseStudents + 5,
    );

    console.log('\n[4] merging moves history and removes the duplicate');
    const ada = (await provider.listStudents({ query: 'Ada Lovelace' }))[0];
    const alan = (await provider.listStudents({ query: 'Alan Turing' }))[0];
    const adaBefore = (await provider.getStudentEnrollments(ada.id)).length;
    const alanBefore = (await provider.getStudentEnrollments(alan.id)).length;

    await provider.mergeStudents(ada.id, alan.id);

    check('absorbed student is gone', await provider.getStudent(alan.id), null);
    check(
        'kept student has both contact emails',
        (await provider.getStudent(ada.id))?.parent_emails,
        ['ada@example.com', 'alan@example.com'],
    );
    // Both were enrolled in the same two courses, so the duplicate enrollments
    // collapse rather than doubling up.
    check(
        'duplicate enrollments collapsed',
        (await provider.getStudentEnrollments(ada.id)).length,
        Math.max(adaBefore, alanBefore),
    );

    console.log('\n[5] overview totals stay consistent');
    const overview = await provider.getOverview();
    check(
        'student count matches store',
        overview.students,
        getStore().students.length,
    );
    check(
        'course count matches store',
        overview.courses,
        getStore().classes.length,
    );
    check(
        'sessions equal the sum of every status',
        overview.sessions,
        Object.values(overview.statusTotals).reduce((a, b) => a + b, 0),
    );

    // Leave a clean sandbox behind for the dev server.
    resetStore();
    console.log('\nstore reset to seed.');

    console.log(
        failures === 0
            ? '\nAll store checks passed.\n'
            : `\n${failures} store check(s) failed.\n`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
