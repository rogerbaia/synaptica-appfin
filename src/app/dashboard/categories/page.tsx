import React, { Suspense } from 'react';
import CategoriesClient from './CategoriesClient';

export const dynamic = 'force-dynamic';

export default function CategoriesPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando categorías...</div>}>
            <CategoriesClient />
        </Suspense>
    );
}
