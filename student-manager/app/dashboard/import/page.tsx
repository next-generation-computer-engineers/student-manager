import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { isCurrentUserAdmin } from '@/lib/auth';

import { ImportWizard } from './_components/import-wizard';

export const metadata = {
    title: 'Import a sheet · Student Manager',
};

export default async function ImportPage() {
    if (!(await isCurrentUserAdmin())) {
        redirect('/dashboard');
    }

    return (
        <>
            <PageHeader
                title="Import a sheet"
                description="Upload an attendance spreadsheet. Columns are detected for you, and you can review everything before it is saved."
            />
            <ImportWizard />
        </>
    );
}
