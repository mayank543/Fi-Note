import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export const metadata: Metadata = {
  title: "Notes App",
  description: "A fast, multi-user notes application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem("theme");
                  if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <Providers>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
