import React, { useEffect } from 'react';
import { Icon } from './Icon';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        info: 'info-circle'
    };

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 animate-slide-in ${bgColors[type]}`}>
            <Icon name={icons[type]} className="text-xl" />
            <span className="font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition">
                <Icon name="times" />
            </button>
        </div>
    );
};
