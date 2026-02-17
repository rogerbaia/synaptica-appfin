import React, { Suspense } from 'react';
import RecurringClient from './RecurringClient';

export default function RecurringPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <RecurringClient />
        </Suspense>
    );
}
