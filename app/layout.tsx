import type { Metadata } from "next";
import "./github.css";

export const metadata: Metadata = {
  title: "GitHub Repository Migration",
  description: "Migrate GitHub repositories using GitHub Enterprise Importer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
