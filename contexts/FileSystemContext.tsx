import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FileNode, TransferItem, SharedItem } from '../types';
import { useAuth } from './AuthContext';
import { formatBytes } from '../utils/format';
import { API_BASE_URL } from '../constants';

interface Clipboard {
    items: Set<string>;
    operation: 'copy' | 'cut' | null;
}

interface FileSystemContextType {
    files: FileNode[];
    currentFolderId: string | null;
    breadcrumbs: FileNode[];
    usedStorage: number;
    transfers: TransferItem[];
    clipboard: Clipboard;
    sharedFiles: SharedItem[];
    navigate: (folderId: string | null) => void;
    createFolder: (name: string) => Promise<void>;
    uploadFile: (file: File) => Promise<void>;
    uploadFiles: (items: { file: File, parentId?: string }[]) => Promise<void>;
    uploadFolder: (files: FileList) => Promise<void>;
    uploadWithStructure: (items: { file: File, path: string }[]) => Promise<void>;
    deleteNode: (id: string) => Promise<void>;
    copyItems: (ids: Set<string>) => void;
    cutItems: (ids: Set<string>) => void;
    pasteItems: () => Promise<void>;
    refreshFiles: () => void;
    shareFiles: (fileIds: string[], userIds: string[]) => Promise<boolean>;
    saveSharedFiles: (fileIds: string[]) => Promise<boolean>;
    clearSharedFiles: () => Promise<void>;
    downloadFile: (fileId: string, fileName: string, isFolder?: boolean) => Promise<void>;
    browseFolder: (folderId: string) => Promise<FileNode[]>;
    cancelTransfer: (id: string) => void;
    clearCompletedTransfers: () => void;
    searchUsers: (query: string) => Promise<any[]>;
    fetchSharedFiles: () => Promise<void>;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [files, setFiles] = useState<FileNode[]>([]);
    const [sharedFiles, setSharedFiles] = useState<SharedItem[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [transfers, setTransfers] = useState<TransferItem[]>([]);
    const [clipboard, setClipboard] = useState<Clipboard>({ items: new Set(), operation: null });

    // Track last sync time to avoid redundant refreshes
    const lastSyncTimeRef = React.useRef<number>(Date.now());

    const fetchFiles = async () => {
        if (!user) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/files?userId=${user.id}&t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                setFiles(data);
                lastSyncTimeRef.current = Date.now();
            }
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    // Polling for file system changes (Real-time sync)
    useEffect(() => {
        if (!user) return;

        const checkUpdates = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/system/status`);
                if (response.ok) {
                    const data = await response.json();
                    // If server has newer changes than our last sync
                    if (data.lastChange > lastSyncTimeRef.current) {
                        console.log('Detected file system change, refreshing...');
                        await fetchFiles();
                    }
                }
            } catch (e) {
                // Ignore polling errors
            }
        };

        // Check every 2 seconds
        const intervalId = setInterval(checkUpdates, 2000);
        return () => clearInterval(intervalId);
    }, [user]);

    // Use a ref to access latest transfers in async callbacks
    const transfersRef = React.useRef(transfers);
    const mergingRefs = React.useRef(new Set<string>());
    // Add a ref to track status immediately without waiting for render
    const transferStatusRef = React.useRef(new Map<string, string>());

    useEffect(() => {
        transfersRef.current = transfers;
        // Sync ref with state on render, but preserve newer local updates if needed?
        // Actually, we just want to know if it's merging/completed.
        transfers.forEach(t => {
            if (!transferStatusRef.current.has(t.id)) {
                transferStatusRef.current.set(t.id, t.status);
            }
        });
    }, [transfers]);

    const updateTransfer = (id: string, updates: Partial<TransferItem>) => {
        if (updates.status) {
            transferStatusRef.current.set(id, updates.status);
        }
        setTransfers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks for better performance
    const MAX_CONCURRENT_UPLOADS = 5; // Allow more concurrent uploads

    // Queue Management Effect
    useEffect(() => {
        const activeCount = transfers.filter(t => t.status === 'processing' || t.status === 'merging').length;

        if (activeCount < MAX_CONCURRENT_UPLOADS) {
            // Find next pending transfer
            // We prioritize uploads by order (first in first out)
            const nextTransfer = transfers.find(t => t.status === 'pending');

            if (nextTransfer) {
                // Start it
                updateTransfer(nextTransfer.id, { status: 'processing', startTime: Date.now() });

                // Give it a moment for state to settle and ref to update
                setTimeout(() => {
                    processUploadChunk(nextTransfer.id, 0);
                }, 100);
            }
        }
    }, [transfers]);

    const processUploadChunk = async (transferId: string, chunkIndex: number, retryCount = 0) => {
        const transfer = transfersRef.current.find(t => t.id === transferId);

        // Retry if transfer not found yet (fix race condition between state update and ref update)
        if (!transfer) {
            if (retryCount < 5) {
                setTimeout(() => processUploadChunk(transferId, chunkIndex, retryCount + 1), 100);
            }
            return;
        }

        if (transfer.status !== 'processing' || !transfer.file || !user) return;

        const { file, uploadId, totalChunks = 0, startTime } = transfer;

        if (chunkIndex >= totalChunks) {
            // Complete

            // Double check status using ref to prevent race conditions
            const currentStatus = transferStatusRef.current.get(transferId);
            if (currentStatus === 'merging' || currentStatus === 'completed') {
                return;
            }

            if (mergingRefs.current.has(transferId)) return;
            mergingRefs.current.add(transferId);

            if (transfer.status !== 'merging') {
                updateTransfer(transferId, { status: 'merging', progress: 100 });
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/upload/complete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': user.id
                    },
                    body: JSON.stringify({
                        uploadId,
                        fileName: file.name,
                        parentId: transfer.parentId || currentFolderId || 'root',
                        totalChunks,
                        mimeType: file.type,
                        size: file.size
                    })
                });

                if (response.ok) {
                    const newFile = await response.json();

                    // Update file list locally first for responsiveness
                    setFiles(prev => {
                        // Check if file already exists to avoid duplicates in UI list
                        const exists = prev.some(f => f.id === newFile.id);
                        if (exists) return prev.map(f => f.id === newFile.id ? newFile : f);
                        return [...prev, newFile];
                    });

                    updateTransfer(transferId, { status: 'completed', progress: 100, loaded: file.size });

                    // Force a refresh from server to ensure everything is synced and accurate
                    // This fixes the "must refresh manually" issue
                    refreshFiles();
                } else if (response.status === 413) {
                    // Quota exceeded
                    const errorData = await response.json();
                    const message = `❌ Upload Failed - Quota Exceeded!\n\n` +
                        `File: ${file.name}\n` +
                        `File size: ${formatBytes(errorData.fileSize || file.size)}\n` +
                        `Available space: ${formatBytes(errorData.availableSpace || 0)}\n\n ` +
                        `Used: ${formatBytes(errorData.usedSpace || 0)} / ${formatBytes(errorData.totalSpace || 0)}`;
                    alert(message);
                    updateTransfer(transferId, { status: 'error' });
                    return;
                } else {
                    console.error('Merge response not OK', response.status, response.statusText);
                    throw new Error('Merge failed');
                }
            } catch (e) {
                console.error('Merge error for transfer:', transferId, e);
                // Retry merge logic?
                // If merge fails, it might be due to server load.
                // But usually merge is all-or-nothing.
                // Let's not retry merge automatically for now to avoid duplication, but show error.
                updateTransfer(transferId, { status: 'error' });
            } finally {
                mergingRefs.current.delete(transferId);
            }
            return;
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk, 'chunk'); // Add filename for Multer compatibility
        formData.append('uploadId', uploadId!);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileName', file.name);
        formData.append('parentId', transfer.parentId || currentFolderId || 'root');

        try {
            // Create abort controller with longer timeout for large chunks
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout per chunk

            const response = await fetch(`${API_BASE_URL}/api/upload/chunk`, {
                method: 'POST',
                headers: { 'x-user-id': user.id },
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const nextIndex = chunkIndex + 1;
                const loaded = Math.min(nextIndex * CHUNK_SIZE, file.size);
                const progress = Math.round((loaded / file.size) * 100);

                // Calculate speed
                const now = Date.now();
                const timeElapsed = (now - (startTime || now)) / 1000; // seconds
                const speed = timeElapsed > 0 ? Math.round(loaded / timeElapsed) : 0; // bytes/sec

                updateTransfer(transferId, {
                    chunkIndex: nextIndex,
                    loaded,
                    progress,
                    speed
                });

                // Continue to next chunk immediately if still processing
                // We use setTimeout to allow state update to propagate/check status
                setTimeout(() => processUploadChunk(transferId, nextIndex), 0);
            } else {
                throw new Error('Chunk upload failed');
            }
        } catch (e) {
            console.error(`Chunk upload error (attempt ${retryCount + 1}):`, e);

            // Increased retry logic for large files
            if (retryCount < 10) { // Increased from 5 to 10 retries
                const delay = Math.min(1000 * Math.pow(1.5, retryCount), 30000); // Max 30s delay
                console.log(`Retrying chunk ${chunkIndex} for ${transferId} in ${delay}ms...`);
                setTimeout(() => processUploadChunk(transferId, chunkIndex, retryCount + 1), delay);
            } else {
                console.error(`Failed to upload chunk ${chunkIndex} after 10 attempts.`);
                updateTransfer(transferId, { status: 'error' });
            }
        }
    };

    // Check quota before upload
    const checkQuota = async (fileSize: number): Promise<{ canUpload: boolean, message?: string, details?: any }> => {
        if (!user) return { canUpload: false, message: 'User not logged in' };

        try {
            const response = await fetch(`${API_BASE_URL}/api/check-quota`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({ fileSize })
            });

            if (response.ok) {
                const data = await response.json();
                if (!data.canUpload) {
                    return {
                        canUpload: false,
                        message: `Storage quota exceeded!\n\nFile size: ${formatBytes(data.requestedSize)}\nAvailable space: ${formatBytes(data.availableSpace)}\nUsed: ${formatBytes(data.usedSpace)} / ${formatBytes(data.totalSpace)}`,
                        details: data
                    };
                }
                return { canUpload: true, details: data };
            } else {
                return { canUpload: false, message: 'Failed to check quota' };
            }
        } catch (error) {
            console.error('Quota check error:', error);
            return { canUpload: false, message: 'Network error while checking quota' };
        }
    };

    const uploadFile = async (file: File, parentFolderId?: string) => {
        if (!user) return;

        // Check quota first
        const quotaCheck = await checkQuota(file.size);
        if (!quotaCheck.canUpload) {
            alert(quotaCheck.message || 'Cannot upload: quota exceeded');
            return;
        }

        const transferId = Math.random().toString(36).substring(7);
        const uploadId = Math.random().toString(36).substring(7);
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        const newTransfer: TransferItem = {
            id: transferId,
            name: file.name,
            type: 'upload',
            progress: 0,
            status: 'processing',
            size: file.size,
            loaded: 0,
            file,
            uploadId,
            chunkIndex: 0,
            totalChunks,
            parentId: parentFolderId || currentFolderId || 'root'
        };

        transferStatusRef.current.set(transferId, 'processing');
        setTransfers(prev => [...prev, newTransfer]);

        // Start processing
        setTimeout(() => processUploadChunk(transferId, 0), 100); // Small delay to allow state update
    };


    const uploadFiles = async (items: { file: File, parentId?: string }[]) => {
        if (!user || items.length === 0) return;

        // Calculate total size of all files
        const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);

        // Check quota for total size
        const quotaCheck = await checkQuota(totalSize);
        if (!quotaCheck.canUpload) {
            alert(`Cannot upload ${items.length} file(s)\n\n` + quotaCheck.message);
            return;
        }

        const newTransfers: TransferItem[] = [];
        const transferIds: string[] = [];

        items.forEach(({ file, parentId }) => {
            const transferId = Math.random().toString(36).substring(7);
            const uploadId = Math.random().toString(36).substring(7);
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

            newTransfers.push({
                id: transferId,
                name: file.name,
                type: 'upload',
                progress: 0,
                status: 'pending',
                size: file.size,
                loaded: 0,
                file,
                uploadId,
                chunkIndex: 0,
                totalChunks,
                parentId: parentId || currentFolderId || 'root'
            });

            transferStatusRef.current.set(transferId, 'pending');
            transferIds.push(transferId);
        });

        // Update ref immediately to prevent race conditions
        transfersRef.current = [...transfersRef.current, ...newTransfers];
        setTransfers(prev => [...prev, ...newTransfers]);

        // Logic moved to useEffect queue manager
    };


    const cancelTransfer = (id: string) => {
        const transfer = transfers.find(t => t.id === id);
        if (transfer && transfer.abortController) {
            transfer.abortController.abort();
        }
        setTransfers(prev => prev.filter(t => t.id !== id));
    };

    const clearCompletedTransfers = (type?: 'upload' | 'download') => {
        setTransfers(prev => prev.filter(t => {
            if (t.status !== 'completed') return true;
            if (type && t.type !== type) return true;
            return false;
        }));
    };

    const downloadFile = async (fileId: string, fileName: string, isFolder: boolean = false) => {
        if (!user) return;

        try {
            // Direct browser download - no in-app notification
            const url = isFolder
                ? `${API_BASE_URL}/api/download-folder/${fileId}?userId=${user.id}`
                : `${API_BASE_URL}/api/download/${fileId}?userId=${user.id}`;

            const a = document.createElement('a');
            a.href = url;
            a.download = isFolder ? `${fileName}.zip` : fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download init error:', error);
        }
    };



    const browseFolder = async (folderId: string): Promise<FileNode[]> => {
        if (!user) return [];
        try {
            const response = await fetch(`${API_BASE_URL}/api/browse/${folderId}`, {
                headers: { 'x-user-id': user.id }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error browsing folder:', error);
        }
        return [];
    };

    const fetchSharedFiles = async () => {
        if (!user) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/shared`, {
                headers: { 'x-user-id': user.id }
            });
            if (response.ok) {
                const data = await response.json();
                setSharedFiles(data);
            }
        } catch (error) {
            console.error('Error fetching shared files:', error);
        }
    };

    useEffect(() => {
        fetchFiles();
        fetchSharedFiles();
    }, [user]);

    const refreshFiles = () => {
        fetchFiles();
        fetchSharedFiles();
    }

    const navigate = (folderId: string | null) => {
        setCurrentFolderId(folderId);
    };

    const breadcrumbs = React.useMemo(() => {
        const path: FileNode[] = [];
        let currId = currentFolderId;
        while (currId) {
            const node = files.find(f => f.id === currId);
            if (node) {
                path.unshift(node);
                currId = node.parentId;
            } else {
                break;
            }
        }
        return path;
    }, [files, currentFolderId]);

    const usedStorage = React.useMemo(() => {
        if (!user) return 0;
        return files.filter(f => f.ownerId === user.id).reduce((acc, curr) => acc + curr.size, 0);
    }, [files, user]);

    const createFolder = async (name: string, parentFolderId?: string, skipRefresh = false): Promise<string | null> => {
        if (!user) return null;
        try {
            const response = await fetch(`${API_BASE_URL}/api/folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({
                    userId: user.id,
                    parentId: parentFolderId || currentFolderId || 'root',
                    name
                })
            });
            if (response.ok) {
                const data = await response.json();
                if (!skipRefresh) fetchFiles();
                return data.id;
            }
        } catch (error) {
            console.error('Error creating folder:', error);
        }
        return null;
    };

    const uploadWithStructure = async (items: { file: File, path: string }[]) => {
        if (!user || items.length === 0) return;

        // Calculate total size
        const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);

        // Determine folder name from first item for confirmation message
        // Path "Folder/Sub/File.txt" -> "Folder"
        // If path is just "File.txt", it's a file at root.
        const firstPath = items[0].path;
        const rootFolder = firstPath.includes('/') ? firstPath.split('/')[0] : 'Multiple Items';

        const confirmed = confirm(
            `📁 Upload With Structure\n\n` +
            `Root: ${rootFolder}\n` +
            `Files: ${items.length}\n` +
            `Total Size: ${formatBytes(totalSize)}\n\n` +
            `Do you want to proceed?`
        );

        if (!confirmed) return;

        const quotaCheck = await checkQuota(totalSize);
        if (!quotaCheck.canUpload) {
            alert(`Cannot upload:\n\n` + quotaCheck.message);
            return;
        }

        const folderCache = new Map<string, string>();

        const ensureFolder = async (fullPath: string): Promise<string | null> => {
            // fullPath is relative path from drag root "Folder/Sub/File.txt" -> we want folder part "Folder/Sub"
            // Wait, path passed to this function is the FOLDER path (e.g. "Folder/Sub")

            if (!fullPath || fullPath === '.') return currentFolderId || 'root';
            if (folderCache.has(fullPath)) return folderCache.get(fullPath)!;

            const parts = fullPath.split('/');
            const folderName = parts.pop()!;
            const parentPath = parts.join('/');

            let parentId: string | null = null;
            if (parentPath === '') {
                parentId = currentFolderId || 'root';
            } else {
                parentId = await ensureFolder(parentPath);
            }

            if (!parentId) return null; // Parent creation failed

            // Use silent creation to avoid refresh storm
            const newFolderId = await createFolder(folderName, parentId === 'root' ? undefined : parentId, true);

            if (newFolderId) {
                folderCache.set(fullPath, newFolderId);
                return newFolderId;
            }
            return null;
        };

        const uploadQueue: { file: File, parentId?: string }[] = [];

        for (const item of items) {
            const pathParts = item.path.split('/');
            // Remove filename
            pathParts.pop();

            let targetFolderId = currentFolderId;

            if (pathParts.length > 0) {
                const folderPath = pathParts.join('/');
                const folderId = await ensureFolder(folderPath);
                if (folderId) {
                    targetFolderId = folderId === 'root' ? null : folderId;
                }
            }

            uploadQueue.push({ file: item.file, parentId: targetFolderId || undefined });
        }

        // Refresh once after structure is created
        refreshFiles();

        await uploadFiles(uploadQueue);
    };

    const uploadFolder = async (files: FileList) => {
        if (!user || files.length === 0) return;
        const items = Array.from(files).map(f => ({
            file: f,
            path: f.webkitRelativePath || f.name
        }));
        await uploadWithStructure(items);
    };

    const deleteNode = async (id: string) => {
        if (!user) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/files/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-user-id': user.id
                }
            });
            if (response.ok) {
                fetchFiles();
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const copyItems = (ids: Set<string>) => {
        setClipboard({ items: ids, operation: 'copy' });
    };

    const cutItems = (ids: Set<string>) => {
        setClipboard({ items: ids, operation: 'cut' });
    };

    const pasteItems = async () => {
        if (!user || clipboard.items.size === 0 || !clipboard.operation) return;

        const endpoint = clipboard.operation === 'copy' ? '/api/files/copy' : '/api/files/move';

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({
                    fileIds: Array.from(clipboard.items),
                    targetFolderId: currentFolderId || 'root'
                })
            });

            if (response.ok) {
                fetchFiles();
                // Clear clipboard after cut, keep after copy
                if (clipboard.operation === 'cut') {
                    setClipboard({ items: new Set(), operation: null });
                }
            }
        } catch (error) {
            console.error('Paste error:', error);
        }
    };

    const shareFiles = async (fileIds: string[], userIds: string[]): Promise<boolean> => {
        if (!user) return false;
        try {
            const response = await fetch(`${API_BASE_URL}/api/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({ fileIds, userIds })
            });
            return response.ok;
        } catch (error) {
            console.error('Share error:', error);
            return false;
        }
    };

    const saveSharedFiles = async (fileIds: string[]): Promise<boolean> => {
        if (!user) return false;
        // Simulate loading if needed or handled by UI
        try {
            const response = await fetch(`${API_BASE_URL}/api/shared/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({
                    fileIds,
                    targetFolderId: 'root' // Always save to root of My Drive to ensure visibility
                })
            });
            if (response.ok) {
                fetchFiles(); // Refresh my files to see the saved ones
                return true;
            }
        } catch (error) {
            console.error('Save shared error:', error);
        }
        return false;
    };

    const clearSharedFiles = async () => {
        if (!user) return;
        try {
            await fetch(`${API_BASE_URL}/api/shared`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            setSharedFiles([]);
        } catch (error) {
            console.error('Clear shared error:', error);
        }
    };



    const searchUsers = async (query: string) => {
        if (!user) return [];
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { 'x-user-id': user.id }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Search user error:', error);
        }
        return [];
    };

    return (
        <FileSystemContext.Provider value={{
            files,
            currentFolderId,
            breadcrumbs,
            usedStorage,
            transfers,
            clipboard,
            sharedFiles,
            navigate,
            createFolder,
            uploadFile,
            uploadFiles,
            uploadFolder,
            uploadWithStructure,
            downloadFile,
            browseFolder,
            deleteNode,
            copyItems,
            cutItems,
            pasteItems,
            refreshFiles,
            shareFiles,
            saveSharedFiles,
            clearSharedFiles,

            cancelTransfer,
            clearCompletedTransfers,
            searchUsers,
            fetchSharedFiles
        }}>
            {children}
        </FileSystemContext.Provider>
    );
};

export const useFileSystem = () => {
    const context = useContext(FileSystemContext);
    if (!context) throw new Error('useFileSystem must be used within an FileSystemProvider');
    return context;
};
