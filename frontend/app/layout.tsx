import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RegStack",
  description: "RegStack Compliance-Cockpit",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
