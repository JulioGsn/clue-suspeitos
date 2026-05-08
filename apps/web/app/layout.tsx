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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Special+Elite&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
