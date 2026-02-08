import type { Metadata } from "next";
import { Manrope, Noto_Sans } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-manrope",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "deGuard",
  description:
    "AI guardian for web3 transactions. Protects and secures contract interactions, signals risky transactions for VDF and FROST checks. Monitor everything from your dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${notoSans.variable}`}>
      <head>
        <link rel="icon" href="data:image/x-icon;base64," />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
