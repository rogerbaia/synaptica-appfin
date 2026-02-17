import React, { Suspense } from 'react';
import BudgetsClient from './BudgetsClient';

export default function BudgetsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <BudgetsClient />
        </Suspense>
    );
}
