import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitDrip — on-chain sponsorship for OSS, scored by AI",
  description:
    "Continuous on-chain sponsorship for open-source projects. AI " +
    "validators read each contributor's commits and split the pool by " +
    "AI-judged substance, not by manual percentages.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
