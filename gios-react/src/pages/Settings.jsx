import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Settings as SettingsIcon, User, Palette, Key, Shield, HardDrive, LogOut } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { theme, setTheme, themes } = useTheme();
  const [activeTab, setActiveTab] = useState('appearance');
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent text-gray-200 overflow-hidden relative font-sans">
      
      {/* Header */}
      <header className="px-8 py-6 border-b border-primary/20 shrink-0 relative z-10 glass-panel !rounded-none !border-t-0 !border-x-0">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold font-['Orbitron'] tracking-wider text-white">System <span className="text-primary">Settings</span></h1>
        </div>
        <p className="text-gray-400 mt-1 text-sm">Manage your workspace preferences, authentication, and application theme.</p>
      </header>

      {/* Main Content Layout */}
      <div className="flex flex-1 overflow-hidden relative z-10 p-6 max-w-7xl mx-auto w-full gap-6">
        
        {/* Settings Sidebar */}
        <aside className="w-64 flex flex-col gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${activeTab === 'appearance' ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_var(--color-primary-20)]' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            <Palette className="w-4 h-4" /> Appearance
          </button>
          
          <button 
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${activeTab === 'account' ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_var(--color-primary-20)]' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            <User className="w-4 h-4" /> Account
          </button>

          <button 
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${activeTab === 'security' ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_var(--color-primary-20)]' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            <Shield className="w-4 h-4" /> Security
          </button>

          <button 
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${activeTab === 'storage' ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_var(--color-primary-20)]' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            <HardDrive className="w-4 h-4" /> Storage Allocation
          </button>

          <button 
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${activeTab === 'api' ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_var(--color-primary-20)]' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            <Key className="w-4 h-4" /> API Tokens
          </button>

          <div className="mt-auto">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border border-transparent text-danger hover:text-red-300 hover:bg-danger/10 uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Settings Detail Pane */}
        <main className="flex-1 overflow-y-auto pr-2 pb-10">
          <div className="glass-panel p-8 max-w-4xl">
            
            {/* ----------------- APPEARANCE TAB ----------------- */}
            {activeTab === 'appearance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-bold text-white mb-6 border-b border-primary/20 pb-4 font-['Rajdhani'] uppercase tracking-wider">Interface Theme</h2>
                
                <p className="text-sm text-gray-400 mb-8">
                  Select a color scheme for the GIOS operating environment. This dynamically adjusts global accents, map overlays, charts, and ambient background effects.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {themes.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative cursor-pointer p-5 rounded-xl border-2 transition-all duration-300 overflow-hidden ${theme === t.id ? 'border-primary bg-primary/10 shadow-[0_0_30px_var(--color-primary-20)]' : 'border-white/10 bg-black/40 hover:border-primary/50'}`}
                    >
                      {/* Live preview background gradient */}
                      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                        background: `linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 100%)`
                      }} />
                      
                      <div className="flex items-center justify-between relative z-10 mb-4">
                        <span className="font-bold text-lg text-white font-['Rajdhani'] tracking-wider">{t.name}</span>
                        {theme === t.id && (
                          <span className="text-[10px] uppercase tracking-widest bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/50">Active</span>
                        )}
                      </div>
                      
                      {/* Color swatches */}
                      <div className="flex gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-lg shadow-lg border border-white/20 flex items-center justify-center text-xs font-bold text-black" style={{ backgroundColor: t.colors[0] }}>Pri</div>
                        <div className="w-10 h-10 rounded-lg shadow-lg border border-white/20 flex items-center justify-center text-xs font-bold text-black" style={{ backgroundColor: t.colors[1] }}>Sec</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ----------------- ACCOUNT TAB ----------------- */}
            {activeTab === 'account' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-bold text-white mb-6 border-b border-primary/20 pb-4 font-['Rajdhani'] uppercase tracking-wider">Account Profile</h2>
                
                <div className="space-y-6">
                  <div className="flex gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary p-1">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                        <User className="w-10 h-10 text-gray-500" />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <button className="glass-button px-4 py-2 text-xs uppercase font-bold tracking-wider w-fit mb-2">Upload Avatar</button>
                      <p className="text-xs text-gray-400">JPG, GIF or PNG. Max size of 800K</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">First Name</label>
                      <input type="text" defaultValue="Dina" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Last Name</label>
                      <input type="text" defaultValue="Administrator" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                      <input type="email" defaultValue="dina@gios.agency" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Organization Role</label>
                      <input type="text" disabled defaultValue="Lead Geospatial Analyst (Level 4)" className="w-full bg-black/60 border border-white/5 rounded-lg px-4 py-2.5 text-gray-500 cursor-not-allowed" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-end">
                    <button className="glass-button px-6 py-2 text-sm font-bold tracking-wider text-primary">Save Changes</button>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- SECURITY TAB ----------------- */}
            {activeTab === 'security' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-bold text-white mb-6 border-b border-primary/20 pb-4 font-['Rajdhani'] uppercase tracking-wider">Security & Authentication</h2>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Change Password</h3>
                    <p className="text-sm text-gray-400 mb-4">Update the password associated with your GIOS console login.</p>
                    <div className="space-y-4 max-w-md">
                      <input type="password" placeholder="Current Password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors" />
                      <input type="password" placeholder="New Password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors" />
                      <input type="password" placeholder="Confirm New Password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors" />
                      <button className="glass-button px-6 py-2 text-sm font-bold tracking-wider text-primary">Update Password</button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">Two-Factor Authentication (2FA)</h3>
                        <p className="text-sm text-gray-400">Secure your account using a mobile authenticator app.</p>
                      </div>
                      <button className="glass-button px-4 py-2 text-xs font-bold uppercase tracking-wider border-primary/50 text-primary">Enable 2FA</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Mock Tabs */}
            {['storage', 'api'].includes(activeTab) && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-64 flex items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                Module configuration loaded dynamically based on privileges.
              </div>
            )}

          </div>
        </main>

      </div>
    </div>
  );
}
