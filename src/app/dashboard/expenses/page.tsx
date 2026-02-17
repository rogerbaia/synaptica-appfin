import React, { Suspense } from 'react';
import ExpensesClient from './ExpensesClient';

export default function ExpensesPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ExpensesClient />
        </Suspense>
    );
}
