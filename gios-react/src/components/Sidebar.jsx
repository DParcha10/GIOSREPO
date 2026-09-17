import React, { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Satellite, Activity, LayoutDashboard, Map, LineChart, Bot, Database, Settings } from 'lucide-react';
import SystemStatus from './SystemStatus';

export default function FlowingMenu() {
  const [hoverIndex, setHoverIndex] = useState(null);
  const menuRef = useRef(null);

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Map Explorer', icon: <Map size={20} />, path: '/map' },
    { name: 'Analytics', icon: <LineChart size={20} />, path: '/analytics' },
    { name: 'Methodology', icon: <Database size={20} />, path: '/methodology' },
    { name: 'JARVIS Copilot', icon: <Bot size={20} />, path: '/ai-agent' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings' },
  ];

  return (
    <motion.div
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="w-72 h-full glass-panel border-y-0 border-l-0 border-r border-primary/20 flex flex-col pt-6 rounded-none z-50 relative overflow-hidden"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-8 mb-12 relative z-10">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-accent shadow-[0_0_15px_var(--color-primary-50)]">
          <Satellite size={24} />
        </div>
        <h1 className="text-2xl font-['Orbitron'] font-bold tracking-wider text-white">
          <span className="text-primary">GIOS</span>
        </h1>
      </div>

      {/* Navigation Container */}
      <nav 
        ref={menuRef}
        className="flex-1 px-4 flex flex-col gap-1 relative z-10"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {menuItems.map((item, index) => {
          const isHovered = hoverIndex === index;
          
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onMouseEnter={() => setHoverIndex(index)}
              className={({ isActive }) => `
                relative group flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 overflow-hidden
                ${isActive ? 'text-primary' : 'text-[#8b9bb4] hover:text-white'}
              `}
            >
              {({ isActive }) => (
                <>
                  {/* The Flowing Hover Background */}
                  {(isHovered || isActive) && (
                    <motion.div 
                      layoutId="flowing-bg"
                      className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-xl"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  
                  {/* Glowing line indicator */}
                  <div className={`absolute left-0 w-1 h-1/2 bg-secondary rounded-r-md transition-all duration-300 ${isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 group-hover:opacity-100 group-hover:scale-y-50'}`} />

                  {/* Icon and Text */}
                  <div className={`relative z-10 transition-transform duration-300 ${isHovered ? 'scale-110 text-primary' : ''}`}>
                    {item.icon}
                  </div>
                  <span className={`relative z-10 font-['Rajdhani'] text-lg uppercase tracking-wider font-bold transition-transform duration-300 ${isHovered ? 'translate-x-2' : ''}`}>
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-primary/20 relative z-10 mt-auto flex flex-col gap-4">
        <SystemStatus />
        <div className="flex items-center justify-between text-xs font-['Roboto_Mono']">
          <div className="flex items-center gap-2 text-primary">
            <Activity size={14} className="animate-pulse" />
            <span className="tracking-wider">LINK SECURED</span>
          </div>
          <div className="text-[10px] text-gray-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded uppercase">
            Admin
          </div>
        </div>

        <button 
          onClick={() => {
            localStorage.removeItem('gios_token');
            window.location.href = '/login';
          }}
          className="glass-button w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-red-400 hover:text-red-300 uppercase tracking-wider font-['Rajdhani']"
        >
          Sign Out Console
        </button>
      </div>
    </motion.div>
  );
}
