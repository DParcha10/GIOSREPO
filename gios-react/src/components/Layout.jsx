import React from 'react';
import Sidebar from './Sidebar';
import UnifiedBackground from './UnifiedBackground';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden text-gray-200 bg-transparent font-['Inter'] relative">
      <UnifiedBackground />
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto relative z-10 flex flex-col">
        {children}
      </main>
    </div>
  );
}
