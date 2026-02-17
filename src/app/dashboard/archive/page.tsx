import React, { Suspense } from 'react';
import ArchiveClient from './ArchiveClient';

export default function ArchivePage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ArchiveClient />
        </Suspense>
    );
}
