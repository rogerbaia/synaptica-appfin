import React, { Suspense } from 'react';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando configuración...</div>}>
            <SettingsClient />
        </Suspense>
    );
}
