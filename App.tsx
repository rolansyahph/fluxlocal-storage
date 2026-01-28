import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FileSystemProvider, useFileSystem } from './contexts/FileSystemContext';
import { AdminDashboard } from './components/AdminDashboard';
import { DriveView } from './components/DriveView';
import { TransferManager } from './components/TransferManager';
import { Icon } from './components/Icon';
import { UserRole, FileNode } from './types';
import { formatBytes } from './utils/format';
import { Toast } from './components/Toast';

const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await login(email, password)) {
      setError('');
    } else {
      const msg = 'Email atau password belum terdaftar';
      setError(msg);
      setToast({ message: msg, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6 text-brand-600 text-5xl">
          <Icon name="cloud" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-1 text-gray-800">FluxLocal Storage</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">Sign in to your account</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-md hover:bg-brand-700 transition">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { usedStorage } = useFileSystem();
  const [view, setView] = useState<'drive' | 'admin' | 'shared'>('drive');
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const storagePercent = user ? Math.min(100, (usedStorage / user.storageLimitBytes) * 100) : 0;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Mobile Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-gray-50 border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
        <div className="p-6 flex items-center justify-between text-brand-600 text-xl font-bold">
          <div className="flex items-center gap-2">
            <Icon name="cloud" /> FluxLocal Storage
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500">
            <Icon name="times" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => { setView('drive'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition ${view === 'drive' ? 'bg-brand-100 text-brand-800' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Icon name="hdd" /> My Drive
          </button>
          <button
            onClick={() => { setView('shared'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition ${view === 'shared' ? 'bg-brand-100 text-brand-800' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Icon name="share-alt" /> Shared with me
          </button>
          {user?.role === UserRole.ADMIN && (
            <button
              onClick={() => { setView('admin'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition ${view === 'admin' ? 'bg-brand-100 text-brand-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Icon name="users-cog" /> Admin Panel
            </button>
          )}
        </nav>

        <div className="p-6 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-2">Storage</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className={`bg-brand-500 h-2 rounded-full`} style={{ width: `${storagePercent}%` }}></div>
          </div>
          <div className="text-xs text-gray-500">
            {formatBytes(usedStorage)} used of {formatBytes(user?.storageLimitBytes || 0)}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-200 text-brand-700 flex items-center justify-center font-bold">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full text-xs text-red-500 hover:text-red-700 text-left flex items-center gap-2">
            <Icon name="sign-out-alt" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md md:hidden"
            >
              <Icon name="bars" className="text-lg" />
            </button>
            <div className="text-lg font-semibold text-gray-700 truncate">
              {view === 'drive' ? 'My Drive' : view === 'shared' ? 'Shared with me' : 'Admin Dashboard'}
            </div>
          </div>
          {view === 'drive' && (
            <div className="hidden sm:block text-sm text-gray-400 italic">
              <Icon name="info-circle" className="mr-1" />
              Select a file to view AI insights
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto bg-white flex relative w-full">
          <div className="flex-1 overflow-auto h-full w-full">
            {view === 'drive' ? (
              <DriveView onSelectFile={setSelectedFile} mode="my-drive" />
            ) : view === 'shared' ? (
              <DriveView onSelectFile={() => { }} mode="shared" />
            ) : (
              <AdminDashboard />
            )}
          </div>
          {/* Transfer Manager Overlay */}
          <TransferManager />
        </main>
      </div>
    </div>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent = () => {
  const { user } = useAuth();

  if (!user) return <LoginScreen />;

  return (
    <FileSystemProvider>
      <MainLayout />
    </FileSystemProvider>
  );
};

export default App;