import { PageHeader } from '@/components/page-header';

import { ImportWizard } from './_components/import-wizard';

export const metadata = {
    title: 'Import a sheet · Student Manager',
};

export default function ImportPage() {
    return (
        <>
            <PageHeader
                title="Import a sheet"
                description="Upload an attendance spreadsheet or paste a Google Sheets link. Columns are detected for you, and you can review everything before it is saved."
            />
            <ImportWizard />
        </>
    );
}
