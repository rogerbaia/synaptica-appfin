import React, { Suspense } from 'react';
import InvoicingClient from './InvoicingClient';

export default function InvoicingPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <InvoicingClient />
        </Suspense>
    );
}
