"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [statusText, setStatusText] = useState('Iniciando Synaptica...');

  useEffect(() => {
    // Safety Force: If stuck for >4s, force login
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Splash hung, forcing login redirect");
        setStatusText("Redirigiendo al Login...");
        window.location.href = '/login';
      }
    }, 4000);

    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
    return () => clearTimeout(timer);
  }, [user, loading, router]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-500">
      <div className="mb-4 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>{statusText}</p>
      </div>
    </div>
  );
}
