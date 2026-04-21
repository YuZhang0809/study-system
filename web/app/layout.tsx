import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { Footer } from "@/components/shell/Footer";
import { KeyboardNav } from "@/components/shell/KeyboardNav";

export const metadata: Metadata = {
  title: "study-system",
  description: "Local-first learning reflection mirror",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <KeyboardNav />
        <div className="app">
          <Sidebar />
          <div className="main">
            <Header />
            <div className="app-body">{children}</div>
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
