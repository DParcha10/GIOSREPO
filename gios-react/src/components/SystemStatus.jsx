import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { getHealthStatus } from '../api/giosApi';
import DecryptedText from './ReactBits/DecryptedText';

export default function SystemStatus() {
  const [status, setStatus] = useState('OFFLINE');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await getHealthStatus();
        if (data.status === 'ok' || data.status === 'healthy') {
          setStatus('ONLINE');
        } else {
          setStatus('UNSTABLE');
        }
      } catch {
        setStatus('OFFLINE');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'ONLINE': return 'text-primary';
      case 'UNSTABLE': return 'text-warning';
      case 'OFFLINE': return 'text-danger';
      default: return 'text-[#8b9bb4]';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'ONLINE': return <ShieldCheck size={14} className="animate-pulse" />;
      case 'UNSTABLE': return <Activity size={14} className="animate-pulse" />;
      case 'OFFLINE': return <ShieldAlert size={14} />;
      default: return <Cpu size={14} />;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[10px] font-['Roboto_Mono'] text-[#8b9bb4] uppercase tracking-[0.2em] mb-1">
        <Cpu size={12} />
        System Core
      </div>
      <div className={`flex items-center gap-2 text-xs font-['Roboto_Mono'] ${getStatusColor()} border border-current/20 bg-current/5 px-3 py-1.5 rounded-md`}>
        {getStatusIcon()}
        <DecryptedText text={status} speed={80} animateOnLoad={true} />
      </div>
    </div>
  );
}
