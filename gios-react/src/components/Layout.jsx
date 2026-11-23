import React from 'react';
import Sidebar from './Sidebar';
import PrototypeNotice from './PrototypeNotice';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-950 text-stone-200">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto flex flex-col">
        <PrototypeNotice />
        {children}
      </main>
    </div>
  );
}
