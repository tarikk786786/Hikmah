import './globals.css';
import React from 'react';
import { Sidebar } from '../components/sidebar';
import { LiveSystemProvider } from '../components/LiveSystemContext';
import { LiveActivityCenter } from '../components/LiveActivityCenter';
import { CommandBar } from '../components/CommandBar';

export const metadata = {
  title: 'J.A.R.V.I.S. — AI Operating System',
  description: 'Modular, production-oriented personal AI assistant operating system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F17] text-[#F1F5F9] antialiased flex h-screen overflow-hidden">
        <LiveSystemProvider>
          <Sidebar />
          <main className="flex-1 h-screen overflow-y-auto bg-[#0B0F17]">
            {children}
          </main>
          <LiveActivityCenter />
          <CommandBar />
        </LiveSystemProvider>
      </body>
    </html>
  );
}
