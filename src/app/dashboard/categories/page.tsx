import React, { Suspense } from 'react';
import CategoriesClient from './CategoriesClient';

export default function CategoriesPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <CategoriesClient />
        </Suspense>
    );
}
