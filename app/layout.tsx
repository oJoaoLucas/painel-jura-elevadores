import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DialogProvider } from "@/components/Dialog";
import { MecanicosProvider } from "@/components/MecanicosProvider";

export const metadata: Metadata = {
  title: "Jura Painel — Jura Auto Center",
  description: "Painel de elevadores, fila de alinhamento e lembretes da Jura Auto Center",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-jura-bg text-white antialiased">
        <DialogProvider>
          <MecanicosProvider>{children}</MecanicosProvider>
        </DialogProvider>
      </body>
    </html>
  );
}
