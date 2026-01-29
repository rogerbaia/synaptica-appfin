import React, { Suspense } from 'react';
import HistoryClient from './HistoryClient';

export const dynamic = 'force-dynamic';

export default function HistoryPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando historial...</div>}>
            <HistoryClient />
        </Suspense>
    );
}
