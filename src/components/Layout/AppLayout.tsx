"use client";

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSubscription } from '@/context/SubscriptionContext';
import { useGabi } from '@/hooks/useGabi';
import GabiFab from '@/components/Gabi/GabiFab';
import GabiInterface from '@/components/Gabi/GabiInterface';
import UpgradeModal from '@/components/Modals/UpgradeModal';
import SmartScanModal from '@/components/Gabi/SmartScanModal';
import TransactionModal from '@/components/Transactions/TransactionModal';
import OnboardingModal from '@/components/Modals/OnboardingModal';
import { useAuth } from '@/context/AuthContext';

interface AppLayoutProps {
    children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
    const { user } = useAuth();
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Check if user has full name metadata
        if (user && !user.user_metadata?.full_name) {
            const hasName = user.user_metadata?.full_name;
            // Double check to be sure (metadata sync can be tricky)
            if (!hasName) setShowOnboarding(true);
        } else {
            setShowOnboarding(false);
        }
    }, [user]);

    // Check for recurring transactions on mount
    // Check for recurring transactions on mount
    useEffect(() => {
        // Safe check for recurring transactions
        const checkRecurring = async () => {
            try {
                const { supabaseService } = await import('@/services/supabaseService');
                await supabaseService.processRecurringTransactions();
            } catch (error) {
                console.error("Recurring check failed:", error);
            }
        };
        // Small delay (Random 2-5s) to randomize execution time and reduce tab collision probability
        const randomDelay = Math.floor(Math.random() * 3000) + 2000;
        const timer = setTimeout(checkRecurring, randomDelay);
        return () => clearTimeout(timer);
    }, []);

    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (pathname && pathname !== '/dashboard') {
            const fullPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
            localStorage.setItem('synaptica_last_route', fullPath);
        }
    }, [pathname, searchParams]);

    // Gabi Logic
    const { tier, showUpgradeModal, setShowUpgradeModal } = useSubscription();
    const [isGabiOpen, setIsGabiOpen] = useState(false);
    const { state, transcript, response, startListening, stopListening, processCommand, speakWithAutoListen, conversation, transactionRequest, setTransactionRequest } = useGabi();

    const handleOpenGabi = () => {
        setIsGabiOpen(true);
        // Unlock Audio Context (Mobile Policy)
        if (typeof window !== 'undefined') {
            window.speechSynthesis.cancel();
        }
        // Direct call without timeout to satisfy user interaction requirement
        speakWithAutoListen("Hola, ¿en qué puedo ayudarte hoy?", true);
    };

    const handleCloseGabi = () => {
        stopListening();
        setIsGabiOpen(false);
    };

    // Scan Logic
    const [isSmartScanOpen, setIsSmartScanOpen] = useState(false);
    const handleOpenScan = () => {
        setIsGabiOpen(false); // Close voice interface
        stopListening();
        setIsSmartScanOpen(true);
    };
    const handleCloseScan = () => setIsSmartScanOpen(false);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Track last route for smart resume
    // We only update if NOT on dashboard root (or if explicitly set by sidebar click)
    // Actually, we trust Sidebar click for exact intent.
    // This is a backup for browser navigation.
    // import { usePathname } from 'next/navigation';
    // const pathname = usePathname(); (Need to import first)

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-color)] transition-colors duration-300 overflow-hidden w-full">
            {/* Header - Full Width Top */}
            <Header
                onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                onProfileClick={() => setIsSidebarOpen(false)}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar - Fixed Left (Starts below Header) */}
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                {/* Main Content Area */}
                <main className="flex-1 md:ml-64 bg-[var(--bg-color)] h-full overflow-y-auto w-full max-w-full overflow-x-hidden p-2 md:p-6 relative z-0">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                        <div className="h-32 w-full flex-shrink-0" aria-hidden="true" />
                    </div>
                </main>
            </div>

            {/* Gabi Assistance (Platinum Only) */}
            {/* Gabi Assistance (Platinum Only) */}
            {tier === 'platinum' && (
                <>
                    {!isGabiOpen && !isSmartScanOpen && <GabiFab onClick={handleOpenGabi} />}
                    <GabiInterface
                        isOpen={isGabiOpen}
                        onClose={handleCloseGabi}
                        state={state}
                        transcript={transcript}
                        response={response}
                        conversation={conversation}
                        onMicClick={state === 'listening' ? stopListening : startListening}
                        onCameraClick={handleOpenScan}
                        onCommand={(cmd) => processCommand(cmd)}
                    />
                    <SmartScanModal
                        isOpen={isSmartScanOpen}
                        onClose={handleCloseScan}
                        onSuccess={(msg) => {
                            // Optional: Make Gabi speak the result
                            const utterance = new SpeechSynthesisUtterance(msg);
                            utterance.lang = 'es-MX';
                            window.speechSynthesis.speak(utterance);
                        }}
                    />

                    {/* Voice Triggered Transaction (Invisible until requested) */}
                    {transactionRequest && (
                        <TransactionModal
                            isOpen={true}
                            onClose={() => setTransactionRequest(null)}
                            onSuccess={() => {
                                setTransactionRequest(null);
                                // Optional: Feedback? Gabi already spoke.
                            }}
                            type={transactionRequest.type}
                            initialData={{
                                type: transactionRequest.type, // FIX: Pass type inside initialData
                                amount: transactionRequest.amount,
                                description: transactionRequest.description,
                                category: transactionRequest.category,
                                date: new Date().toISOString()
                            }}
                        />
                    )}
                </>
            )}

            {/* Global Upgrade Modal */}
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
            />

            {/* Mandatory Onboarding */}
            <OnboardingModal
                isOpen={showOnboarding}
                onSuccess={() => {
                    setShowOnboarding(false);
                    // Force a reload or re-fetch of user might be needed, 
                    // but onAuthStateChange in context should handle metadata updates if we are lucky.
                    // If not, a simple window reload ensures smooth state.
                    window.location.reload();
                }}
            />
        </div>
    );
};

export default AppLayout;
