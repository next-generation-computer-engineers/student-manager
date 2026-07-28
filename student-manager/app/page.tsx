import { redirect } from 'next/navigation';

import { isMockMode } from '@/lib/config';

export default function Page() {
    redirect(isMockMode ? '/dashboard' : '/auth/login');
}
