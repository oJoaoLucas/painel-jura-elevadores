import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DialogProvider } from "@/components/Dialog";
import { MecanicosProvider } from "@/components/MecanicosProvider";
import { VocabularioProvider } from "@/components/VocabularioProvider";
import RegistrarPWA from "@/components/RegistrarPWA";

export const metadata: Metadata = {
  title: "Jura Painel — Jura Auto Center",
  description: "Painel de elevadores, fila de alinhamento e lembretes da Jura Auto Center",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#C8102E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-jura-bg text-white antialiased">
        <RegistrarPWA />
        <DialogProvider>
          <MecanicosProvider>
            <VocabularioProvider>{children}</VocabularioProvider>
          </MecanicosProvider>
        </DialogProvider>
      </body>
    </html>
  );
}
