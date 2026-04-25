import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // Importe aqui

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'TratoMarcado | Agendamento Inteligente',
  description: 'Agendamento online prático e profissional.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <body 
        className={`${inter.className} bg-black text-white antialiased`} 
        suppressHydrationWarning // ADICIONE ISSO AQUI TAMBÉM
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
