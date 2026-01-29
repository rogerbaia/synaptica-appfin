import React, { Suspense } from 'react';
import PendingClient from './PendingClient';

export const dynamic = 'force-dynamic';

export default function PendingPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando pendientes...</div>}>
            <PendingClient />
        </Suspense>
    );
}
