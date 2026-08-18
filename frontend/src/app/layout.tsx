import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { DevToolsBlocker } from "@/components/DevToolsBlocker";

export const metadata: Metadata = {
  title: "EasyPrint - Gestion & Impression des Chèques & Effets",
  description: "Plateforme web de saisie, paramétrage de gabarits visuels et impression haute précision sur chèques et effets.",
  icons: { icon: "/icon.png?v=3", shortcut: "/favicon.ico?v=3", apple: "/apple-touch-icon.png?v=3" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full bg-slate-50 antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <DevToolsBlocker />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
