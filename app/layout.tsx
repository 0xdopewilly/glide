import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/context/auth-context";
import { WalletProvider } from "@/context/wallet-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Glide",
  description: "Move money instantly. Simple, fast, and familiar.",
  icons: {
    icon: "/logo-mark.png",
    apple: "/logo-mark.png",
  },
  appleWebApp: {
    title: "Glide",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full`}
    >
      <body className="h-full font-sans antialiased" suppressHydrationWarning>
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            enableColorScheme
            storageKey="glide-theme"
            disableTransitionOnChange
          >
            <AuthProvider>
              <WalletProvider>{children}</WalletProvider>
            </AuthProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
