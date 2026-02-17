import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Critical for safe-area-inset
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" }, // Gray-900 to match dark mode header
  ],
  colorScheme: "light dark", // Helps browser determine default scrollbar/system UI
};
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SettingsProvider } from "@/context/SettingsContext"; // Restore
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import StatusbarController from "@/components/StatusbarController";
import SmartDownloadBanner from "@/components/SmartDownloadBanner"; // Restore
import { Toaster } from 'sonner'; // Restore

export const metadata: Metadata = {
  title: "Aurea - Gestión Financiera Inteligente",
  description: "Plataforma de bienestar financiero impulsada por Gabi AI.",
};



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
                  <StatusbarController />
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
