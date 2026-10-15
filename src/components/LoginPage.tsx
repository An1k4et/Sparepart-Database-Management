import React, { useState } from 'react';
import { FiLock, FiUser, FiDatabase, FiAlertCircle } from 'react-icons/fi';

// =========================================================================
// 🔑 HARDCODED LOGIN CREDENTIALS (CHANGE HERE)
// =========================================================================
export const HARDCODED_USERNAME = 'admin';       // Line 7: Change Username
export const HARDCODED_PASSWORD = 'password123'; // Line 8: Change Password
// =========================================================================

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === HARDCODED_USERNAME && password === HARDCODED_PASSWORD) {
      setError(null);
      onLogin();
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl mb-3 shadow-lg shadow-blue-500/20">
            <FiDatabase size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">SPDM Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Spare Part Data Management System</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center gap-2.5 text-red-200 text-xs">
            <FiAlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Username
            </label>
            <div className="relative flex items-center">
              <FiUser className="absolute left-3 text-slate-400" size={18} />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="Enter username"
                className="w-full bg-slate-800/90 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Password
            </label>
            <div className="relative flex items-center">
              <FiLock className="absolute left-3 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter password"
                className="w-full bg-slate-800/90 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-lg shadow-blue-600/30 text-sm mt-2 cursor-pointer"
          >
            Sign In
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-500 mt-6">
        Protected System &bull; Unauthorized Access Prohibited
      </p>
    </div>
  );
};

export default LoginPage;
