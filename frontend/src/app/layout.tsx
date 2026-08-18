import type { Metadata } from "next";
import Script from "next/script";
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
    <html lang="fr" className="h-full bg-slate-50 antialiased" suppressHydrationWarning>
      <head>
        <Script
          id="strip-extension-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{new MutationObserver(function(){document.querySelectorAll("[data-dashlane-rid],[data-dashlane-autofill]").forEach(function(e){e.removeAttribute("data-dashlane-rid");e.removeAttribute("data-dashlane-autofill")})}).observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0})}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <DevToolsBlocker />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
