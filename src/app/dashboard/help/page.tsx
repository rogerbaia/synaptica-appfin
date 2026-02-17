import React, { Suspense } from 'react';
import HelpClient from './HelpClient';

export default function HelpPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <HelpClient />
        </Suspense>
    );
}
