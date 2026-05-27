import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestor de Demandas Técnicas",
  description: "Gestão de demandas e comissionamento do time técnico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn(inter.variable, "min-h-screen bg-background font-sans antialiased")}>
        {children}
      </body>
    </html>
  );
}
