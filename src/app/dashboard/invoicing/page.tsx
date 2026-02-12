import React, { Suspense } from 'react';
import InvoicingClient from './InvoicingClient';

export const dynamic = 'force-dynamic';

export default function InvoicingPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando módulo de facturación...</div>}>
            <InvoicingClient />
        </Suspense>
    );
}
