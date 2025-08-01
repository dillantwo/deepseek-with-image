import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { assets } from '@/assets/assets';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatflowSelector = ({ selectedChatflow, onChatflowChange }) => {
    const [chatflows, setChatflows] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // List of allowed chatflow IDs
    const allowedChatflowIds = [
        '4246f046-843f-473a-83bc-e196b73214cd', // Chinese
        'b1ce49fc-53bb-49b1-aec4-4fa5d788d750', // English
        'bed35024-cc23-4d4e-b0c5-800cf4eab1e9',  // Water
        '768fcedf-5976-4953-b9bf-09b907364236', // Math
        '57f929ff-c54b-4542-9dd0-a6eb45811ab0', // Science
    ]; // no answer

    // Get chatflows list
    useEffect(() => {
        fetchChatflows();
    }, []);

    const fetchChatflows = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/chatflows');
            if (response.data.success) {
                // Filter to show only allowed chatflow IDs
                const filteredChatflows = response.data.data.filter(chatflow => 
                    allowedChatflowIds.includes(chatflow.id)
                );
                setChatflows(filteredChatflows);
                // If no chatflow is selected, default to the first allowed chatflow
                if (!selectedChatflow && filteredChatflows.length > 0) {
                    onChatflowChange(filteredChatflows[0]);
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
            {/* Selection button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-[#404045] border border-gray-300/40 rounded-lg hover:bg-gray-500/20 transition-colors w-full max-w-56 justify-between overflow-hidden"
                disabled={isLoading}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                    <Image src={assets.chat_icon} alt="" className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left flex-1 min-w-0 overflow-hidden">
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

            {/* Dropdown menu */}
            {isOpen && !isLoading && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-64 bg-[#2f2f35] border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {chatflows.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-400">
                            No chatflows available
                        </div>
                    ) : (
                        chatflows.map((chatflow) => (
                            <button
                                key={chatflow.id}
                                onClick={() => handleSelect(chatflow)}
                                className={`w-full text-left px-3 py-2 hover:bg-gray-600/50 transition-colors border-b border-gray-600/30 last:border-b-0 overflow-hidden ${
                                    selectedChatflow?.id === chatflow.id ? 'bg-gray-600/30' : ''
                                }`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${chatflow.deployed ? 'bg-green-500' : 'bg-gray-500'}`} />
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="text-sm font-medium text-white truncate">
                                            {chatflow.name}
                                        </div>
                                        {chatflow.description && (
                                            <div className="text-xs text-gray-400 truncate">
                                                {chatflow.description}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500 truncate">
                                            {chatflow.category} • {chatflow.deployed ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                    
                    {/* Refresh button */}
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
