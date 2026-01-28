import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useFileSystem } from '../contexts/FileSystemContext';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedFileIds: Set<string>;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, selectedFileIds }) => {
    const { searchUsers, shareFiles } = useFileSystem();
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSearchResults([]);
            setSelectedUsers([]);
        }
    }, [isOpen]);

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (val.length >= 2) {
            setLoading(true);
            const results = await searchUsers(val);
            setSearchResults(results);
            setLoading(false);
        } else {
            setSearchResults([]);
        }
    };

    const handleSelectUser = (user: any) => {
        if (!selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers([...selectedUsers, user]);
        }
        setQuery('');
        setSearchResults([]);
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
    };

    const handleShare = async () => {
        if (selectedUsers.length === 0) return;
        setSharing(true);
        const success = await shareFiles(Array.from(selectedFileIds), selectedUsers.map(u => u.id));
        setSharing(false);
        if (success) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-scale-in">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Share Files</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <Icon name="times" />
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Add people</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={handleSearch}
                            placeholder="Enter email to search..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {loading && (
                            <div className="absolute right-3 top-2.5">
                                <Icon name="spinner" className="animate-spin text-gray-400" />
                            </div>
                        )}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto z-10">
                                {searchResults.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex flex-col"
                                    >
                                        <span className="font-medium text-gray-800">{user.username}</span>
                                        <span className="text-sm text-gray-500">{user.email}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {selectedUsers.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">People with access</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedUsers.map(user => (
                                <div key={user.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {user.username[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{user.username}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveUser(user.id)} className="text-gray-400 hover:text-red-500">
                                        <Icon name="times" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={selectedUsers.length === 0 || sharing}
                        className={`px-4 py-2 bg-blue-600 text-white rounded-md transition flex items-center gap-2 ${
                            (selectedUsers.length === 0 || sharing) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                        }`}
                    >
                        {sharing ? <Icon name="spinner" className="animate-spin" /> : <Icon name="share-alt" />}
                        Share
                    </button>
                </div>
            </div>
        </div>
    );
};
