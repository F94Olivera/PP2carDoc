import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const themeInitScript = `try{var s=localStorage.getItem("cardoc-theme");var t=s==="light"?"light":"dark";document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t}catch{document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}`;
const localeInitScript = `try{var k="cardoc-locale";var l=localStorage.getItem(k);if(l!=="en"&&l!=="es"){l="es";localStorage.setItem(k,l)}document.documentElement.lang=l}catch{}`;

export const metadata: Metadata = {
  title: "carDoc",
  description: "Sistema de gestión para talleres mecánicos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
