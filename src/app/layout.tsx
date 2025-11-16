import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Excel to JSON Converter",
  description: "Convert Excel files to JSON format with conversion history tracking",
  keywords: ["Excel", "JSON", "Converter", "File conversion", "Data transformation"],
  authors: [{ name: "Excel to JSON Converter" }],
  icons: {
    icon: "https://z-ai-chat-protocol-1253292771.cos.ap-shanghai.myqcloud.com/favicon.ico",
  },
  openGraph: {
    title: "Excel to JSON Converter",
    description: "Convert Excel files to JSON format with conversion history tracking",
    url: "https://chat.z.ai",
    siteName: "Excel to JSON Converter",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Excel to JSON Converter",
    description: "Convert Excel files to JSON format with conversion history tracking",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
