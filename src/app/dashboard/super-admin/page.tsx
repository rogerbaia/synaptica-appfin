import React, { Suspense } from 'react';
import SuperAdminClient from './SuperAdminClient';

export const dynamic = 'force-dynamic';

export default function SuperAdminPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando administración...</div>}>
            <SuperAdminClient />
        </Suspense>
    );
}
