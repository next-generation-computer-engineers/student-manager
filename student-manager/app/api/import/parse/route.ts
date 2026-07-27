import { NextResponse } from 'next/server';

import {
    fetchGoogleSheet,
    GoogleSheetError,
    parseGoogleSheetUrl,
} from '@/lib/import/google-sheets';
import { cellToString } from '@/lib/import/normalize';
import { parseSheet } from '@/lib/import/parse-sheet';
import { ACCEPTED_EXTENSIONS, readWorkbook } from '@/lib/import/read-workbook';
import type { ColumnMapping } from '@/lib/import/types';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const SAMPLE_ROWS = 3;

function bad(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
    let data: ArrayBuffer;
    let filename: string;
    let mapping: Partial<ColumnMapping> | undefined;
    let courseName: string | undefined;

    const contentType = request.headers.get('content-type') ?? '';

    try {
        if (contentType.includes('multipart/form-data')) {
            const form = await request.formData();
            const file = form.get('file');

            if (!(file instanceof File)) return bad('No file was uploaded.');
            if (file.size === 0) return bad('That file is empty.');
            if (file.size > MAX_BYTES) {
                return bad('That file is larger than 10 MB.');
            }

            const lower = file.name.toLowerCase();
            const hasKnownExtension = ACCEPTED_EXTENSIONS.some((extension) =>
                lower.endsWith(extension),
            );
            if (!hasKnownExtension && !lower.endsWith('.xls')) {
                return bad(
                    `Unsupported file type. Upload one of: ${ACCEPTED_EXTENSIONS.join(', ')}.`,
                );
            }
            if (lower.endsWith('.xls')) {
                return bad(
                    'Legacy .xls files are not supported. Open it and re-save as .xlsx or .csv.',
                );
            }

            data = await file.arrayBuffer();
            filename = file.name;

            const rawMapping = form.get('mapping');
            if (typeof rawMapping === 'string' && rawMapping !== '') {
                mapping = JSON.parse(rawMapping) as Partial<ColumnMapping>;
            }
            const rawCourseName = form.get('courseName');
            if (typeof rawCourseName === 'string' && rawCourseName !== '') {
                courseName = rawCourseName;
            }
        } else {
            const body = (await request.json()) as {
                url?: string;
                mapping?: Partial<ColumnMapping>;
                courseName?: string;
            };

            if (!body.url) return bad('No spreadsheet URL was provided.');

            const ref = parseGoogleSheetUrl(body.url);
            if (!ref) {
                return bad(
                    'That does not look like a Google Sheets link. It should contain /spreadsheets/d/...',
                );
            }

            const fetched = await fetchGoogleSheet(ref);
            data = fetched.data;
            filename = fetched.filename;
            mapping = body.mapping;
            courseName = body.courseName;
        }
    } catch (error) {
        if (error instanceof GoogleSheetError) return bad(error.message);
        console.error('[import] could not read request', error);
        return bad('Could not read the upload.');
    }

    try {
        const grid = await readWorkbook(data, filename);
        const sheet = parseSheet(grid, filename, { mapping, courseName });

        // Give the client enough of the raw grid to offer a manual remap.
        const header = grid.rows[sheet.headerRowIndex] ?? [];
        const body = grid.rows.slice(sheet.headerRowIndex + 1);
        const width = grid.rows.reduce((max, row) => Math.max(max, row.length), 0);

        const columns = Array.from({ length: width }, (_, index) => ({
            index,
            label: cellToString(header[index]),
            samples: body
                .map((row) => cellToString(row[index]))
                .filter((value) => value !== '')
                .slice(0, SAMPLE_ROWS),
        }));

        return NextResponse.json({ sheet, columns });
    } catch (error) {
        console.error('[import] parse failed', error);
        return bad(
            error instanceof Error
                ? `Could not read that spreadsheet: ${error.message}`
                : 'Could not read that spreadsheet.',
            422,
        );
    }
}
