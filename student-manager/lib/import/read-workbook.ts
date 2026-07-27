import Papa from 'papaparse';

import type { CellValue } from './normalize';

export interface SheetGrid {
    /** Dense row-major grid; short rows are padded so every row is equal width. */
    rows: CellValue[][];
    sheetName: string;
}

export const ACCEPTED_EXTENSIONS = ['.xlsx', '.xlsm', '.csv', '.tsv', '.txt'];

function extensionOf(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}

function pad(rows: CellValue[][]): CellValue[][] {
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
    return rows.map((row) => {
        const copy = row.slice();
        while (copy.length < width) copy.push(null);
        return copy;
    });
}

async function readExcel(buffer: Buffer): Promise<SheetGrid> {
    // Imported lazily so the (large, Node-only) parser stays out of any bundle
    // that merely imports the surrounding types.
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();

    // exceljs ships a Buffer type that predates the generic
    // Buffer<ArrayBufferLike> in current @types/node; the value is correct.
    type LoadInput = Parameters<typeof workbook.xlsx.load>[0];

    try {
        await workbook.xlsx.load(buffer as unknown as LoadInput);
    } catch {
        // exceljs surfaces the underlying JSZip error, which is meaningless to
        // someone who just picked the wrong file.
        throw new Error(
            'that file is not a readable .xlsx workbook. If it came from ' +
                'another program, open it and re-save as .xlsx or .csv.',
        );
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('That workbook has no sheets in it.');


    const rows: CellValue[][] = [];
    const width = Math.max(sheet.columnCount, 1);

    for (let r = 1; r <= sheet.rowCount; r += 1) {
        const row = sheet.getRow(r);
        const cells: CellValue[] = [];
        for (let c = 1; c <= width; c += 1) {
            cells.push(row.getCell(c).value as CellValue);
        }
        rows.push(cells);
    }

    return { rows: pad(rows), sheetName: sheet.name };
}

function readDelimited(text: string, delimiter?: string): SheetGrid {
    const result = Papa.parse<string[]>(text, {
        delimiter,
        skipEmptyLines: false,
        header: false,
    });
    return { rows: pad(result.data ?? []), sheetName: 'Sheet1' };
}

export async function readWorkbook(
    data: ArrayBuffer,
    filename: string,
): Promise<SheetGrid> {
    const extension = extensionOf(filename);
    const buffer = Buffer.from(data);

    if (extension === '.csv') return readDelimited(buffer.toString('utf8'), ',');
    if (extension === '.tsv') return readDelimited(buffer.toString('utf8'), '\t');
    if (extension === '.txt') return readDelimited(buffer.toString('utf8'));

    if (extension === '.xlsx' || extension === '.xlsm') {
        return readExcel(buffer);
    }

    // No usable extension (common for Google Sheets exports and pasted blobs):
    // sniff the ZIP magic number that every .xlsx begins with.
    const isZip =
        buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (isZip) return readExcel(buffer);

    return readDelimited(buffer.toString('utf8'));
}
