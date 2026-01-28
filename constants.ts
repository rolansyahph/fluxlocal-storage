import { User, UserRole } from './types';

export const INITIAL_ADMIN: User = {
  id: 'admin-1',
  username: 'Admin User',
  email: 'admin@fluxlocal.com',
  password: '123',
  role: UserRole.ADMIN,
  storageLimitBytes: 1024 * 1024 * 1024 * 10, // 10 GB
};

export const INITIAL_USER: User = {
  id: 'user-1',
  username: 'Demo User',
  email: 'user@fluxlocal.com',
  password: '123',
  role: UserRole.USER,
  storageLimitBytes: 1024 * 1024 * 100, // 100 MB
};

export const MOCK_FILES_KEY = 'cloudvault_files';
export const MOCK_USERS_KEY = 'cloudvault_users';
export const MOCK_SHARES_KEY = 'cloudvault_shares';
export const MOCK_DISMISSED_SHARES_KEY = 'cloudvault_dismissed_shares';
export const CURRENT_USER_KEY = 'cloudvault_current_user';
export const API_BASE_URL = typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001';

