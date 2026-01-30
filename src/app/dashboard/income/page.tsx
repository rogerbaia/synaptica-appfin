import React, { Suspense } from 'react';
import IncomeClient from './IncomeClient';

export const dynamic = 'force-dynamic';

export default function IncomePage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando ingresos...</div>}>
            <IncomeClient />
        </Suspense>
    );
}
