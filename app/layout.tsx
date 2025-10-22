import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Open Source - Chat with Your Website",
  description: "Open source RAG (Retrieval-Augmented Generation) system for chatting with website content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
