import React, { Suspense } from 'react';
import SettingsClient from './SettingsClient';

export default function SettingsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SettingsClient />
        </Suspense>
    );
}
