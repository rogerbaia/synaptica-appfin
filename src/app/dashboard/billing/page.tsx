import React, { Suspense } from 'react';
import BillingClient from './BillingClient';

export default function BillingPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <BillingClient />
        </Suspense>
    );
}
