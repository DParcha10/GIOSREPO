import React from 'react';
import Sidebar from './Sidebar';
import PrototypeNotice from './PrototypeNotice';

export default function Layout({ children, fill = false }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-950 text-stone-200">
      <Sidebar />
      <main className={`flex-1 h-full flex flex-col min-w-0 ${fill ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <PrototypeNotice />
        {children}
      </main>
    </div>
  );
}
