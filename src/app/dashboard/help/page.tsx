import React, { Suspense } from 'react';
import HelpClient from './HelpClient';

export const dynamic = 'force-dynamic';

export default function HelpPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando ayuda...</div>}>
            <HelpClient />
        </Suspense>
    );
}
