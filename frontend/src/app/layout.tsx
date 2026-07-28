import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "@/hooks/use-auth";

export const metadata: Metadata = {
  title: "Legal CMS",
  description: "AI-powered Legal Case Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
