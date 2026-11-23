import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import TiepointMark from '../components/TiepointMark';

const field =
  'w-full bg-stone-900 border border-stone-700 focus:border-stone-400 text-stone-50 px-3 py-2.5 rounded-[3px] outline-none';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setBusy(true);
    try {
      if (isRegistering) {
        await register(username, password);
        setSuccessMsg('Account created. You can sign in now.');
        setIsRegistering(false);
        setPassword('');
      } else {
        await login(username, password);
        navigate('/map');
      }
    } catch {
      /* the store holds the message */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      <header className="px-8 py-6">
        <Link to="/" className="inline-flex items-center gap-2.5 text-stone-50">
          <TiepointMark size={24} />
          <span className="font-serif text-lg font-semibold">Tiepoint</span>
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-[8vh]">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl text-stone-50 mb-1">
            {isRegistering ? 'Create an account' : 'Sign in'}
          </h1>
          <p className="text-stone-400 mb-8 text-[15px]">
            {isRegistering
              ? 'Only works if the server allows sign-ups.'
              : 'Use the account set up on your Tiepoint server.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="block text-sm text-stone-300 mb-1.5">Username</span>
              <input className={field} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </label>
            <label className="block">
              <span className="block text-sm text-stone-300 mb-1.5">Password</span>
              <input
                type="password"
                className={field}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                required
              />
            </label>

            {error && <p className="text-sm text-red-300 border-l-2 border-red-400 pl-3">{error}</p>}
            {successMsg && <p className="text-sm text-emerald-300 border-l-2 border-emerald-400 pl-3">{successMsg}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[var(--ink)] text-[var(--paper)] py-2.5 rounded-[3px] font-medium hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'One moment…' : isRegistering ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <button
            onClick={() => { setIsRegistering(!isRegistering); setSuccessMsg(''); }}
            className="mt-6 text-sm text-stone-400 underline underline-offset-4 decoration-stone-600 hover:text-stone-100"
          >
            {isRegistering ? 'I already have an account' : 'I need an account'}
          </button>
        </div>
      </main>
    </div>
  );
}
