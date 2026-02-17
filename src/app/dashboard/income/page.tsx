import React, { Suspense } from 'react';
import IncomeClient from './IncomeClient';

export default function IncomePage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <IncomeClient />
        </Suspense>
    );
}
