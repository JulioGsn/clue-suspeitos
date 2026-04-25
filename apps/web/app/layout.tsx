import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Detetive: Arquivo Secreto",
  description: "Web adaptation of the classic deduction game Clue Suspeitos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
