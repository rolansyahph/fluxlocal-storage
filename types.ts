export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // In a real app, never store plain text. Mocking here.
  role: UserRole;
  storageLimitBytes: number;
  usedStorageBytes?: number;
}

export interface FileNode {
  id: string;
  parentId: string | null; // null for root
  ownerId: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  content?: string; // For text files or base64 data (mock storage)
  mimeType?: string;
  createdAt: number;
}

export interface SharedItem extends FileNode {
  sharedBy: {
    id: string;
    username: string;
    email: string;
  };
  sharedAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface FileSystemState {
  nodes: FileNode[];
  currentFolderId: string | null;
}

export type TransferStatus = 'pending' | 'processing' | 'merging' | 'paused' | 'completed' | 'error';
export type TransferType = 'upload' | 'download';

export interface TransferItem {
  id: string;
  name: string;
  type: TransferType;
  progress: number; // 0-100
  status: TransferStatus;
  size: number;
  loaded: number;
  file?: File; // For resume logic
  uploadId?: string; // For backend correlation
  chunkIndex?: number;
  totalChunks?: number;
  abortController?: AbortController; // For canceling/pausing
  parentId?: string;
  startTime?: number;
  speed?: number; // bytes per second
}