import React, { Suspense } from 'react';
import SuperAdminClient from './SuperAdminClient';

export default function SuperAdminPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SuperAdminClient />
        </Suspense>
    );
}
