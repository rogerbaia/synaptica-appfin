import React, { Suspense } from 'react';
import HistoryClient from './HistoryClient';

export default function HistoryPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <HistoryClient />
        </Suspense>
    );
}
