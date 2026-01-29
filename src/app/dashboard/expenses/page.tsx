import React, { Suspense } from 'react';
import ExpensesClient from './ExpensesClient';

export const dynamic = 'force-dynamic';

export default function ExpensesPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando gastos...</div>}>
            <ExpensesClient />
        </Suspense>
    );
}
