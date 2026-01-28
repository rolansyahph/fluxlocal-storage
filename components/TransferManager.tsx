import React, { useState } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { Icon } from './Icon';
import { formatBytes } from '../utils/format';
import { TransferItem } from '../types';

const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '--';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return `${m}m ${s}s`;
};

const TransferList = ({ 
    title, 
    type, 
    items, 
    onClear, 
    colorClass 
}: { 
    title: string, 
    type: 'upload' | 'download', 
    items: TransferItem[], 
    onClear: () => void,
    colorClass: string 
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (items.length === 0) return null;

    const hasCompleted = items.some(t => t.status === 'completed' || t.status === 'error');

    return (
        <div className="bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden flex flex-col font-sans mb-4 last:mb-0 w-80">
            {/* Header */}
            <div 
                className={`${colorClass} text-white p-3 flex justify-between items-center cursor-pointer hover:opacity-90 transition`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {items.some(t => t.status === 'processing' || t.status === 'merging' || t.status === 'pending') ? (
                        <Icon name="circle-notch" className="fa-spin text-white/80" />
                    ) : (
                        <Icon name="check-circle" className="text-white/80" />
                    )}
                    <span className="text-sm font-medium">
                        {title} ({items.length})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                     <Icon name={isExpanded ? "chevron-down" : "chevron-up"} className="text-xs text-white/70" />
                </div>
            </div>

            {/* Body */}
            {isExpanded && (
                <div className="max-h-48 overflow-y-auto bg-gray-50 border-t border-gray-100">
                    {hasCompleted && (
                        <div className="p-2 text-right">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onClear(); }} 
                                className={`text-xs ${type === 'upload' ? 'text-blue-600 hover:text-blue-800' : 'text-green-600 hover:text-green-800'} px-2 font-medium`}
                            >
                                Clear list
                            </button>
                        </div>
                    )}
                   
                   {[...items].reverse().map(item => (
                     <div key={item.id} className="p-3 border-b border-gray-100 bg-white last:border-0 hover:bg-gray-50">
                       <div className="flex justify-between items-center mb-1">
                         <div className="flex items-center gap-2 truncate pr-2 flex-1">
                            <Icon 
                                name={type === 'upload' ? 'arrow-up' : 'arrow-down'} 
                                className="text-xs text-gray-400" 
                            />
                            <span className="text-sm text-gray-700 truncate font-medium w-32 md:w-40" title={item.name}>
                                {item.name}
                            </span>
                         </div>
                         <span className={`text-xs font-mono ${item.status === 'error' ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                            {item.status === 'error' ? 'Error' : 
                             item.status === 'merging' ? 'Merging...' : 
                             item.status === 'pending' ? 'Pending...' :
                             `${Math.round(item.progress)}%`}
                         </span>
                       </div>
                       
                       {/* Progress Bar */}
                       <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                         <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                                item.status === 'error' ? 'bg-red-500' : 
                                item.status === 'merging' ? 'bg-yellow-500 animate-pulse' : 
                                type === 'upload' ? 'bg-blue-500' : 'bg-green-500'
                            }`} 
                            style={{ width: `${item.progress}%` }}
                         ></div>
                       </div>
                       
                       {/* Details */}
                       <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                           <span>
                               {formatBytes(item.loaded)} / {formatBytes(item.size)}
                           </span>
                           {item.status === 'processing' && item.speed !== undefined && (
                               <span>
                                   {formatBytes(item.speed)}/s • {formatTime((item.size - item.loaded) / item.speed)} left
                               </span>
                           )}
                       </div>
                     </div>
                   ))}
                </div>
            )}
        </div>
    );
};

export const TransferManager: React.FC = () => {
  const { transfers, clearCompletedTransfers } = useFileSystem();

  const uploads = transfers.filter(t => t.type === 'upload');
  const downloads = transfers.filter(t => t.type === 'download');

  if (transfers.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end max-w-[calc(100vw-2rem)] animate-slide-in-up">
        <TransferList 
            title="Uploads" 
            type="upload" 
            items={uploads} 
            onClear={() => clearCompletedTransfers('upload')}
            colorClass="bg-blue-600"
        />
        <TransferList 
            title="Downloads" 
            type="download" 
            items={downloads} 
            onClear={() => clearCompletedTransfers('download')}
            colorClass="bg-green-600"
        />
    </div>
  );
};
