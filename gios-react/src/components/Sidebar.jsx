import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { getHealthStatus } from '../api/giosApi';
import TiepointMark from './TiepointMark';

const NAV = [
  { name: 'Overview', path: '/dashboard' },
  { name: 'Map', path: '/map' },
  { name: 'Analysis', path: '/analytics' },
  { name: 'Assistant', path: '/ai-agent' },
  { name: 'Methods', path: '/methodology' },
  { name: 'Settings', path: '/settings' },
];

function ServerLine() {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      getHealthStatus()
        .then((d) => alive && setOk(d?.status === 'ok' || d?.status === 'healthy'))
        .catch(() => alive && setOk(false));
    check();
    const t = setInterval(check, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const label = ok === null ? 'Checking server…' : ok ? 'Server reachable' : 'Server not reachable';
  const dot = ok === null ? 'bg-stone-600' : ok ? 'bg-emerald-400' : 'bg-red-400';
  return (
    <p className="flex items-center gap-2 text-xs text-stone-400">
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} /> {label}
    </p>
  );
}

export default function Sidebar() {
  const username = useAuthStore((s) => s.username);
  return (
    <aside className="w-56 shrink-0 h-full flex flex-col border-r border-stone-800 bg-stone-900">
      <div className="px-5 pt-6 pb-8">
        <NavLink to="/" className="flex items-center gap-2.5 text-stone-50 no-underline">
          <TiepointMark size={26} />
          <span className="font-serif text-xl font-semibold">Tiepoint</span>
        </NavLink>
        <p className="mt-1.5 text-[11px] leading-snug text-stone-500">Research prototype</p>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-3 py-2 text-[15px] rounded-[3px] border-l-2 ${
                isActive
                  ? 'border-primary bg-stone-950 text-stone-50 font-medium'
                  : 'border-transparent text-stone-400 hover:text-stone-100 hover:bg-stone-950'
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-5 border-t border-stone-800 flex flex-col gap-3">
        <ServerLine />
        {username && (
          <p className="text-xs text-stone-500">
            Signed in as <span className="text-stone-200">{username}</span>
          </p>
        )}
        <button
          onClick={async () => {
            await useAuthStore.getState().logout();
            window.location.href = '/login';
          }}
          className="self-start text-sm text-stone-300 underline underline-offset-4 decoration-stone-600 hover:text-red-400"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
