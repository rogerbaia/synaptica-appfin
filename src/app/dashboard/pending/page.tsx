import React, { Suspense } from 'react';
import PendingClient from './PendingClient';

export default function PendingPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <PendingClient />
        </Suspense>
    );
}
