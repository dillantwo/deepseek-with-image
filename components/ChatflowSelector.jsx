import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { assets } from '@/assets/assets';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatflowSelector = ({ selectedChatflow, onChatflowChange }) => {
    const [chatflows, setChatflows] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 获取chatflows列表
    useEffect(() => {
        fetchChatflows();
    }, []);

    const fetchChatflows = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/chatflows');
            if (response.data.success) {
                setChatflows(response.data.data);
                // 如果没有选中的chatflow，默认选择第一个
                if (!selectedChatflow && response.data.data.length > 0) {
                    onChatflowChange(response.data.data[0]);
                }
            } else {
                toast.error('Failed to load chatflows');
            }
        } catch (error) {
            console.error('Error fetching chatflows:', error);
            toast.error('Failed to load chatflows');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (chatflow) => {
        onChatflowChange(chatflow);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* 选择按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-[#404045] border border-gray-300/40 rounded-lg hover:bg-gray-500/20 transition-colors min-w-48 max-w-56 justify-between"
                disabled={isLoading}
            >
                <div className="flex items-center gap-2">
                    <Image src={assets.chat_icon} alt="" className="w-4 h-4" />
                    <div className="text-left flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                            {isLoading ? 'Loading...' : (selectedChatflow?.name || 'Select Chatflow')}
                        </div>
                        {selectedChatflow && (
                            <div className="text-xs text-gray-400 truncate">
                                {selectedChatflow.category} • {selectedChatflow.deployed ? 'Active' : 'Inactive'}
                            </div>
                        )}
                    </div>
                </div>
                <Image 
                    src={assets.arrow_icon} 
                    alt="" 
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {/* 下拉菜单 */}
            {isOpen && !isLoading && (
                <div className="absolute top-full left-0 mt-1 w-full max-w-xs bg-[#2f2f35] border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {chatflows.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-400">
                            No chatflows available
                        </div>
                    ) : (
                        chatflows.map((chatflow) => (
                            <button
                                key={chatflow.id}
                                onClick={() => handleSelect(chatflow)}
                                className={`w-full text-left px-3 py-2 hover:bg-gray-600/50 transition-colors border-b border-gray-600/30 last:border-b-0 ${
                                    selectedChatflow?.id === chatflow.id ? 'bg-gray-600/30' : ''
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${chatflow.deployed ? 'bg-green-500' : 'bg-gray-500'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">
                                            {chatflow.name}
                                        </div>
                                        {chatflow.description && (
                                            <div className="text-xs text-gray-400 truncate">
                                                {chatflow.description}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            {chatflow.category} • {chatflow.deployed ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                    
                    {/* 刷新按钮 */}
                    <div className="px-3 py-2 border-t border-gray-600/30">
                        <button
                            onClick={() => {
                                fetchChatflows();
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            <Image src={assets.regenerate_icon} alt="" className="w-3 h-3" />
                            Refresh chatflows
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatflowSelector;
