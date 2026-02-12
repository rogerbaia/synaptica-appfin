import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Critical for safe-area-inset
  themeColor: "#ffffff",
};
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SettingsProvider } from "@/context/SettingsContext";

import { SubscriptionProvider } from "@/context/SubscriptionContext";
import NotificationInitializer from "@/components/NotificationInitializer";
import { ConfirmProvider } from "@/context/ConfirmContext";

export const metadata: Metadata = {
  title: "Aurea - Gestión Financiera Inteligente",
  description: "Plataforma de bienestar financiero impulsada por Gabi AI.",

};

import { Toaster } from 'sonner';

import SmartDownloadBanner from "@/components/SmartDownloadBanner";

// ... (Metadata stays same)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <LanguageProvider>
            <SettingsProvider>
              <SubscriptionProvider>
                <ConfirmProvider>
                  {/* <NotificationInitializer /> Disabled until firebase config is ready */}
                  {children}
                  <SmartDownloadBanner />
                  <Toaster richColors position="top-center" />
                </ConfirmProvider>
              </SubscriptionProvider>
            </SettingsProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
