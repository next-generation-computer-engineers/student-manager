const SHEET_ID = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const GID = /[#&?]gid=([0-9]+)/;

export interface GoogleSheetRef {
    id: string;
    gid: string | null;
}

export function parseGoogleSheetUrl(input: string): GoogleSheetRef | null {
    const trimmed = input.trim();
    if (trimmed === '') return null;

    const idMatch = trimmed.match(SHEET_ID);
    if (!idMatch) return null;

    const gidMatch = trimmed.match(GID);
    return { id: idMatch[1], gid: gidMatch ? gidMatch[1] : null };
}

export function exportUrlFor(ref: GoogleSheetRef): string {
    const base = `https://docs.google.com/spreadsheets/d/${ref.id}/export`;
    // A gid identifies a single tab, which only the CSV export honours; without
    // one, take the whole workbook as xlsx and read its first sheet.
    return ref.gid === null
        ? `${base}?format=xlsx`
        : `${base}?format=csv&gid=${ref.gid}`;
}

export class GoogleSheetError extends Error {}

export async function fetchGoogleSheet(
    ref: GoogleSheetRef,
): Promise<{ data: ArrayBuffer; filename: string }> {
    const url = exportUrlFor(ref);

    let response: Response;
    try {
        response = await fetch(url, { redirect: 'follow' });
    } catch {
        throw new GoogleSheetError(
            'Could not reach Google Sheets. Check your network connection.',
        );
    }

    if (response.status === 404) {
        throw new GoogleSheetError(
            'That spreadsheet does not exist, or the link is wrong.',
        );
    }

    if (!response.ok) {
        throw new GoogleSheetError(
            `Google Sheets returned ${response.status} ${response.statusText}.`,
        );
    }

    const contentType = response.headers.get('content-type') ?? '';
    // A private sheet redirects to a sign-in page and still answers 200, so the
    // content type is the only reliable tell.
    if (contentType.includes('text/html')) {
        throw new GoogleSheetError(
            'That spreadsheet is private. In Google Sheets choose Share, then ' +
                'set General access to "Anyone with the link", and try again.',
        );
    }

    const data = await response.arrayBuffer();
    const extension = ref.gid === null ? 'xlsx' : 'csv';
    return { data, filename: `google-sheet-${ref.id}.${extension}` };
}
