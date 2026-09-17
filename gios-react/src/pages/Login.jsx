import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { ShieldAlert, LogIn } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const { login, register, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    try {
      if (isRegistering) {
        await register(username, password);
        setSuccessMsg('Authorization granted. Account created successfully!');
        setIsRegistering(false);
        setPassword('');
      } else {
        await login(username, password);
        navigate('/');
      }
    } catch (err) {
      console.error(isRegistering ? 'Registration failed' : 'Login failed', err);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900/95 backdrop-blur-md z-[9999]">
      <div className="w-[400px] p-8 border border-teal-500/20 shadow-[0_0_30px_rgba(0,255,170,0.1)] bg-gray-800/50 backdrop-blur-lg rounded-xl">
        <div className="text-center mb-8">
          <ShieldAlert className="w-16 h-16 mx-auto text-teal-400 mb-4" />
          <h2 className="text-2xl font-bold text-white tracking-widest font-['Orbitron']">GIOS SECURE LOGIN</h2>
          <p className="text-gray-400 text-sm mt-2 uppercase tracking-widest">Authorized Personnel Only</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-teal-400 text-sm font-semibold mb-2 uppercase tracking-wide">Operator ID</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 focus:border-teal-400 text-white px-4 py-3 rounded outline-none transition-colors"
              required 
              placeholder="Enter operator ID"
            />
          </div>
          <div>
            <label className="block text-teal-400 text-sm font-semibold mb-2 uppercase tracking-wide">Passcode</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 focus:border-teal-400 text-white px-4 py-3 rounded outline-none transition-colors"
              required 
              placeholder="Enter passcode"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-teal-500/20 hover:bg-teal-500/40 border border-teal-500 text-teal-400 font-bold py-3 rounded flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
          >
            <LogIn className="w-5 h-5" /> {isRegistering ? 'Register Access' : 'Authenticate'}
          </button>

          {error && (
            <div className="text-red-400 text-sm text-center mt-4 bg-red-900/20 border border-red-500/50 py-2 rounded">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="text-teal-400 text-sm text-center mt-4 bg-teal-900/20 border border-teal-500/50 py-2 rounded">
              {successMsg}
            </div>
          )}
        </form>
        
        <div className="mt-6 text-center border-t border-gray-700/50 pt-4">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setSuccessMsg('');
            }}
            className="text-gray-400 hover:text-teal-300 text-xs font-mono underline transition-colors"
          >
            {isRegistering ? 'Existing Operator? Authenticate Here' : 'New Operator? Request Access Clearance'}
          </button>
        </div>
        
        <div className="mt-8 text-center border-t border-gray-700/50 pt-4">
          <p className="text-gray-500 text-xs">System v2.5.0 | Quantum Encryption Active</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
