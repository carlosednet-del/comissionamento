import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Gestor de Demandas Técnicas",
  description: "Gestão de demandas e comissionamento do time técnico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* Anti-flash: apply saved theme before first paint */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('color-theme');if(t==='petroleum')document.documentElement.setAttribute('data-theme','petroleum');}catch(e){}})()`,
          }}
        />
      </head>
      <body className={cn(plusJakartaSans.variable, "min-h-screen bg-background font-sans antialiased")}>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
