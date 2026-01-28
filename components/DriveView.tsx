import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useAuth } from '../contexts/AuthContext';
import { FileNode } from '../types';
import { Icon } from './Icon';
import { formatDate, formatBytes } from '../utils/format';
import { ShareModal } from './ShareModal';

interface DriveViewProps {
    onSelectFile: (file: FileNode) => void;
    mode?: 'my-drive' | 'shared';
}

export const DriveView: React.FC<DriveViewProps> = ({ onSelectFile, mode = 'my-drive' }) => {
    const { user } = useAuth();
    const {
        files, currentFolderId, breadcrumbs,
        navigate, uploadFile, uploadFiles, uploadFolder, createFolder, deleteNode, refreshFiles,
        clipboard, copyItems, cutItems, pasteItems,
        sharedFiles, saveSharedFiles, clearSharedFiles, downloadFile, browseFolder,
        transfers, cancelTransfer
    } = useFileSystem();

    const [dragActive, setDragActive] = useState(false);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // UI States
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Sorting State
    const [sortKey, setSortKey] = useState<'name' | 'size' | 'createdAt'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Loading State
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Cache for shared folder navigation
    const [cachedSharedFiles, setCachedSharedFiles] = useState<FileNode[]>([]);
    const [isLoadingShared, setIsLoadingShared] = useState(false);

    // Fetch shared folder content on navigation
    useEffect(() => {
        if (mode === 'shared' && currentFolderId) {
            setIsLoadingShared(true);
            browseFolder(currentFolderId).then(children => {
                setCachedSharedFiles(prev => {
                    const others = prev.filter(f => f.parentId !== currentFolderId);
                    return [...others, ...children];
                });
            }).finally(() => setIsLoadingShared(false));
        } else if (mode === 'shared' && !currentFolderId) {
            setCachedSharedFiles([]);
            setIsLoadingShared(false);
        }
    }, [currentFolderId, mode]);

    // Auto hide toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Clear selection on folder navigation
    useEffect(() => {
        setSelectedIds(new Set());
    }, [currentFolderId, mode]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setActiveMenuId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Filter and Sort files
    const currentItems = useMemo(() => {
        let list: FileNode[] = [];

        if (mode === 'shared') {
            if (currentFolderId) {
                // Inside a shared folder
                list = cachedSharedFiles.filter(f => f.parentId === currentFolderId);
            } else {
                // Root shared view
                list = sharedFiles;
            }
        } else {
            // My Drive Mode
            if (currentFolderId) {
                list = files.filter(f => f.parentId === currentFolderId);
            } else {
                list = files.filter(f => !f.parentId); // Root
            }
        }

        return list.sort((a, b) => {
            let aValue = a[sortKey];
            let bValue = b[sortKey];
            if (sortKey === 'name') {
                aValue = (aValue as string).toLowerCase();
                bValue = (bValue as string).toLowerCase();
            }
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [files, sharedFiles, cachedSharedFiles, currentFolderId, sortKey, sortDirection, mode]);

    // Selection Logic
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(currentItems.map(f => f.id));
            setSelectedIds(allIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const toggleSelection = (e: React.MouseEvent | React.ChangeEvent, id: string) => {
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        setActiveMenuId(null); // Close menu if open
    };

    const handleSaveToDrive = async () => {
        if (selectedIds.size === 0) return;
        setIsSaving(true);
        setToastMessage({ type: 'success', message: 'Saving to My Drive...' });

        try {
            const success = await saveSharedFiles(Array.from(selectedIds));
            if (success) {
                setToastMessage({ type: 'success', message: 'Saved to My Drive successfully' });
                setSelectedIds(new Set());
            } else {
                setToastMessage({ type: 'error', message: 'Failed to save files' });
            }
        } catch (err) {
            setToastMessage({ type: 'error', message: 'An error occurred' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = async () => {
        if (selectedIds.size === 0) return;

        const itemsToDownload = currentItems.filter(f => selectedIds.has(f.id));

        if (itemsToDownload.length === 0) {
            setToastMessage({ type: 'error', message: 'No items selected' });
            return;
        }

        for (const item of itemsToDownload) {
            // Pass isFolder parameter to downloadFile
            const isFolder = item.type === 'folder';
            await downloadFile(item.id, item.name, isFolder);
            // Small delay to prevent browser blocking multiple downloads
            if (itemsToDownload.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    };

    const handleClearShared = async () => {
        if (confirm('Are you sure you want to clear all shared files? This will remove them from your list.')) {
            await clearSharedFiles();
            setToastMessage({ type: 'success', message: 'Shared files cleared' });
        }
    };


    const handleHeaderSort = (key: 'name' | 'size' | 'createdAt') => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Check if any file has a path separator in its name (rare) or handle folder detection
            // Note: webkitRelativePath is often empty on drag/drop unless using specific APIs.
            // For now, we'll try to detect if we can use uploadFolder, but without webkitGetAsEntry it's hard to know structure on drop.
            // However, if we assume standard file drop, we just upload files.
            // If the user drops a folder, modern browsers might treat it as a file with 0 size or type "" or provide webkitRelativePath.

            // Better approach for Drop:
            const hasFolders = Array.from(e.dataTransfer.files).some((file: any) => file.webkitRelativePath && file.webkitRelativePath.includes('/'));

            if (hasFolders) {
                uploadFolder(e.dataTransfer.files);
            } else {
                const files = Array.from(e.dataTransfer.files).map(file => ({ file }));
                uploadFiles(files);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files).map(file => ({ file }));
            uploadFiles(files);
        }
    };

    const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadFolder(e.target.files);
        }
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderName.trim()) {
            try {
                await createFolder(newFolderName);
                setNewFolderName('');
                setShowNewFolderInput(false);
                setToastMessage({ type: 'success', message: `Folder "${newFolderName}" created successfully!` });
            } catch (e) {
                setToastMessage({ type: 'error', message: 'Failed to create folder' });
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            await deleteNode(id);
            setToastMessage({ type: 'success', message: 'Item deleted' });
        }
    };

    const handleDeleteSelected = async () => {
        if (confirm(`Delete ${selectedIds.size} items?`)) {
            for (const id of selectedIds) {
                await deleteNode(id);
            }
            setSelectedIds(new Set());
            setToastMessage({ type: 'success', message: 'Items deleted' });
        }
    };

    return (
        <div
            className={`h-full flex flex-col ${dragActive ? 'bg-brand-50 ring-2 ring-brand-300' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white flex-wrap gap-3">
                {/* Breadcrumbs */}
                <div className="flex items-center text-sm text-gray-600 overflow-hidden">
                    <button
                        onClick={() => navigate(null)}
                        className={`hover:text-brand-600 flex items-center ${!currentFolderId ? 'font-bold text-gray-900' : ''}`}
                    >
                        <Icon name={mode === 'shared' ? "share-alt" : "hdd"} className="mr-2" />
                        {mode === 'shared' ? 'Shared with me' : 'Drive'}
                    </button>
                    {mode !== 'shared' && breadcrumbs.map((node, index) => (
                        <div key={node.id} className="flex items-center whitespace-nowrap">
                            <span className="mx-2 text-gray-400">/</span>
                            <button
                                onClick={() => navigate(node.id)}
                                className={`hover:text-brand-600 truncate max-w-[150px] ${index === breadcrumbs.length - 1 ? 'font-bold text-gray-900' : ''}`}
                            >
                                {node.name}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <div className="mr-4 flex items-center gap-2 animate-fade-in">
                            <span className="text-sm text-gray-500 font-medium">{selectedIds.size} selected</span>
                            {mode === 'my-drive' ? (
                                <>
                                    <button
                                        onClick={() => { setIsShareModalOpen(true); }}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
                                        title="Share Selected"
                                    >
                                        <Icon name="share-alt" />
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
                                        title="Download Selected"
                                    >
                                        <Icon name="download" />
                                    </button>
                                    <button
                                        onClick={() => { copyItems(selectedIds); setToastMessage({ type: 'success', message: 'Copied to clipboard' }); setSelectedIds(new Set()); }}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
                                        title="Copy Selected"
                                    >
                                        <Icon name="copy" />
                                    </button>
                                    <button
                                        onClick={() => { cutItems(selectedIds); setToastMessage({ type: 'success', message: 'Cut to clipboard' }); setSelectedIds(new Set()); }}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
                                        title="Cut Selected"
                                    >
                                        <Icon name="cut" />
                                    </button>
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition"
                                        title="Delete Selected"
                                    >
                                        <Icon name="trash" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleDownload}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
                                        title="Download Selected"
                                    >
                                        <Icon name="download" />
                                    </button>
                                    <button
                                        onClick={handleSaveToDrive}
                                        disabled={isSaving}
                                        className={`p-2 text-brand-600 hover:bg-brand-50 rounded-md transition ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title="Save to My Drive"
                                    >
                                        {isSaving ? <Icon name="spinner" className="animate-spin" /> : <Icon name="cloud-download-alt" />}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {mode === 'my-drive' && clipboard.items.size > 0 && (
                        <button
                            onClick={async () => { await pasteItems(); setToastMessage({ type: 'success', message: 'Items pasted' }); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-medium text-sm shadow-sm"
                            title={`Paste ${clipboard.items.size} items`}
                        >
                            <Icon name="paste" /> Paste
                        </button>
                    )}

                    {mode === 'shared' && (
                        <button
                            onClick={handleClearShared}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-medium text-sm shadow-sm"
                        >
                            <Icon name="times-circle" /> Clear All Shared
                        </button>
                    )}

                    <button
                        onClick={() => { refreshFiles(); setToastMessage({ type: 'success', message: 'Refreshing...' }); }}
                        className="p-2 text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded-md transition"
                        title="Refresh"
                    >
                        <Icon name="sync-alt" />
                    </button>

                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Icon name="th-large" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Icon name="list" />
                        </button>
                    </div>

                    {mode === 'my-drive' && (
                        <>
                            <button
                                onClick={() => setShowNewFolderInput(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition font-medium text-sm"
                            >
                                <Icon name="folder-plus" /> New Folder
                            </button>
                            <button
                                onClick={() => folderInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition font-medium text-sm shadow-sm"
                            >
                                <Icon name="folder-open" /> Upload Folder
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition font-medium text-sm shadow-sm"
                            >
                                <Icon name="cloud-upload-alt" /> Upload File
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                                multiple
                            />
                            <input
                                type="file"
                                ref={folderInputRef}
                                className="hidden"
                                onChange={handleFolderChange}
                                {...({ webkitdirectory: "", directory: "" } as any)}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* New Folder Input */}
            {showNewFolderInput && (
                <div className="p-4 bg-gray-50 border-b border-gray-200 animate-slide-down">
                    <form onSubmit={handleCreateFolder} className="flex items-center gap-2 max-w-md">
                        <Icon name="folder" className="text-gray-400 text-xl" />
                        <input
                            autoFocus
                            type="text"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 text-sm"
                        />
                        <button type="submit" className="px-3 py-2 bg-brand-600 text-white rounded-md text-sm">Create</button>
                        <button
                            type="button"
                            onClick={() => setShowNewFolderInput(false)}
                            className="px-3 py-2 text-gray-500 hover:bg-gray-200 rounded-md text-sm"
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 animate-bounce-in ${toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    <Icon name={toastMessage.type === 'success' ? 'check-circle' : 'exclamation-circle'} className="mr-2" />
                    {toastMessage.message}
                </div>
            )}

            {/* File List / Grid */}
            <div className="flex-1 overflow-y-auto p-4" onClick={() => { setSelectedIds(new Set()); setActiveMenuId(null); }}>
                {isLoadingShared ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Icon name="spinner" className="text-4xl mb-4 animate-spin text-brand-500" />
                        <p className="text-sm">Loading folder contents...</p>
                    </div>
                ) : currentItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Icon name="folder-open" className="text-6xl mb-4 text-gray-200" />
                        <p className="text-lg font-medium">This folder is empty</p>
                        <p className="text-sm">Drag and drop files here or click Upload</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {currentItems.map(node => (
                            <div
                                key={node.id}
                                onClick={(e) => toggleSelection(e, node.id)}
                                onDoubleClick={() => node.type === 'folder' ? navigate(node.id) : onSelectFile(node)}
                                className={`
                            group relative p-4 rounded-xl border transition cursor-pointer flex flex-col items-center text-center hover:shadow-md
                            ${selectedIds.has(node.id) ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-300' : 'bg-white border-gray-200 hover:border-brand-200'}
                        `}
                            >
                                <div className="text-4xl mb-3 transition-transform group-hover:scale-110">
                                    {node.type === 'folder' ? (
                                        <Icon name="folder" className="text-yellow-400" />
                                    ) : (
                                        <Icon name="file-alt" className="text-gray-400" />
                                    )}
                                </div>
                                <p className="text-sm font-medium text-gray-700 truncate w-full mb-1">{node.name}</p>
                                <p className="text-xs text-gray-400">
                                    {mode === 'shared' && 'sharedBy' in node
                                        ? `Shared by ${(node as any).sharedBy.username} • ${node.type === 'folder' ? '-' : formatBytes(node.size)}`
                                        : node.type === 'folder' ? formatDate(node.createdAt) : formatBytes(node.size)
                                    }
                                </p>

                                {/* Context Menu Trigger */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === node.id ? null : node.id); }}
                                    className={`absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 ${activeMenuId === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                >
                                    <Icon name="ellipsis-v" />
                                </button>

                                {/* Context Menu */}
                                {activeMenuId === node.id && (
                                    <div className="absolute top-8 right-2 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-10 overflow-hidden text-left animate-fade-in">
                                        {mode === 'my-drive' ? (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); node.type === 'folder' ? navigate(node.id) : onSelectFile(node); setActiveMenuId(null); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <Icon name="eye" className="text-gray-400" /> Open
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); setSelectedIds(new Set([node.id])); setActiveMenuId(null); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <Icon name="share-alt" className="text-gray-400" /> Share
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); downloadFile(node.id, node.name, node.type === 'folder'); setActiveMenuId(null); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <Icon name="download" className="text-gray-400" /> Download
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); copyItems(new Set([node.id])); setToastMessage({ type: 'success', message: 'Copied' }); setActiveMenuId(null); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <Icon name="copy" className="text-gray-400" /> Copy
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); cutItems(new Set([node.id])); setToastMessage({ type: 'success', message: 'Cut' }); setActiveMenuId(null); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <Icon name="cut" className="text-gray-400" /> Cut
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(node.id); setActiveMenuId(null); }} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                    <Icon name="trash" className="text-red-400" /> Delete
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); node.type === 'folder' ? navigate(node.id) : onSelectFile(node); setActiveMenuId(null); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <Icon name="eye" className="text-gray-400" /> Open
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); downloadFile(node.id, node.name, node.type === 'folder'); setActiveMenuId(null); }} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <Icon name="download" className="text-gray-400" /> Download
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); saveSharedFiles([node.id]); setToastMessage({ type: 'success', message: 'Saved to My Drive' }); setActiveMenuId(null); }} className="w-full px-4 py-2 text-sm text-brand-600 hover:bg-brand-50 flex items-center gap-2">
                                                    <Icon name="cloud-download-alt" className="text-brand-400" /> Save to Drive
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-6 flex items-center cursor-pointer hover:text-gray-700" onClick={() => handleHeaderSort('name')}>
                                <input
                                    type="checkbox"
                                    className="mr-3 rounded text-brand-600 focus:ring-brand-500"
                                    checked={selectedIds.size === currentItems.length && currentItems.length > 0}
                                    onChange={handleSelectAll}
                                />
                                Name
                            </div>
                            <div className="col-span-3 cursor-pointer hover:text-gray-700" onClick={() => handleHeaderSort('size')}>Size</div>
                            <div className="col-span-3 cursor-pointer hover:text-gray-700" onClick={() => handleHeaderSort('createdAt')}>Date</div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {currentItems.map(node => (
                                <div
                                    key={node.id}
                                    onClick={(e) => toggleSelection(e, node.id)}
                                    onDoubleClick={() => node.type === 'folder' ? navigate(node.id) : onSelectFile(node)}
                                    className={`grid grid-cols-12 gap-4 p-3 items-center hover:bg-gray-50 transition cursor-pointer ${selectedIds.has(node.id) ? 'bg-brand-50' : ''}`}
                                >
                                    <div className="col-span-6 flex items-center min-w-0">
                                        <input
                                            type="checkbox"
                                            className="mr-3 rounded text-brand-600 focus:ring-brand-500"
                                            checked={selectedIds.has(node.id)}
                                            onChange={(e) => toggleSelection(e, node.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="mr-3 text-lg text-gray-400">
                                            <Icon name={node.type === 'folder' ? 'folder' : 'file-alt'} className={node.type === 'folder' ? 'text-yellow-400' : ''} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 truncate">{node.name}</span>
                                    </div>
                                    <div className="col-span-3 text-sm text-gray-500">{node.type === 'folder' ? '-' : formatBytes(node.size)}</div>
                                    <div className="col-span-2 text-sm text-gray-500 truncate">{formatDate(node.createdAt)}</div>
                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }}
                                            className="text-gray-400 hover:text-red-500 p-1"
                                        >
                                            <Icon name="trash" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                selectedFileIds={selectedIds}
            />
        </div>
    );
};
