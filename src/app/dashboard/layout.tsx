import React, { Suspense } from 'react';
import AppLayout from '@/components/Layout/AppLayout';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
            <AppLayout>
                {children}
            </AppLayout>
        </Suspense>
    );
}
