/**
 * Writes the sample attendance workbook to disk so it can be dropped into the
 * import page by hand.
 *
 *   npx tsx scripts/make-fixture.ts /tmp/roster.xlsx
 */
import fs from 'node:fs';

import { buildRosterWorkbook, SESSIONS, STUDENT_COUNT } from './fixture';

const OUT = process.argv[2] ?? '/tmp/roster.xlsx';

async function main() {
    const buffer = await buildRosterWorkbook();
    fs.writeFileSync(OUT, Buffer.from(buffer));
    console.log(
        `wrote ${OUT} (${STUDENT_COUNT} students, ${SESSIONS.length} sessions)`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
