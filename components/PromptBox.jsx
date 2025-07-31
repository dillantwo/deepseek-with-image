import { assets } from '@/assets/assets'
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import Image from 'next/image'
import React, { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast';

const PromptBox = ({setIsLoading, isLoading}) => {

    const [prompt, setPrompt] = useState('');
    const [uploadedImages, setUploadedImages] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [previewModal, setPreviewModal] = useState({ isOpen: false, image: null });
    const [textareaHeight, setTextareaHeight] = useState('auto');
    const streamingRef = useRef(false); // Track streaming status
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const {user, chats, setChats, selectedChat, setSelectedChat, selectedChatflow, setSelectedChatflow, createNewChat} = useAppContext();
    const {getToken} = useAuth();

    // Preset quick phrases
    const quickPrompts = [
        { text: 'Good', content: 'Good! ' },
        { text: "Let's learn", content: "Let's learn！" },
        { text: 'Please recommend', content: 'Please recommend！' },
        { text: 'Please continue', content: 'Please continue ' },
        { text: 'Free to chat', content: 'Free to chat ' }
    ];

    // Handle quick phrase click - send message directly
    const handleQuickPrompt = async (content) => {
        // Create a mock event object for sendPrompt function
        const mockEvent = {
            preventDefault: () => {}
        };
        
        // Temporarily set prompt to quick phrase content
        const originalPrompt = prompt;
        setPrompt(content);
        
        // Wait for a microtask to ensure state update
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Directly call sendPrompt to send message
        try {
            await sendPromptWithContent(mockEvent, content);
        } catch (error) {
            // If sending fails, restore original prompt
            setPrompt(originalPrompt);
        }
    };

    // Clean up streaming status
    useEffect(() => {
        return () => {
            streamingRef.current = false;
        };
    }, []);

    // Auto-adjust textarea height
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to get correct scrollHeight
            textarea.style.height = 'auto';
            
            // Calculate content height
            const scrollHeight = textarea.scrollHeight;
            const lineHeight = 24; // Height per line
            const minHeight = lineHeight * 2; // Minimum 2 lines
            const maxHeight = lineHeight * 8; // Maximum 8 lines
            
            // Set height but don't exceed maximum
            const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
            textarea.style.height = `${newHeight}px`;
            
            // Enable scrolling if content exceeds maximum height
            if (scrollHeight > maxHeight) {
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.overflowY = 'hidden';
            }
        }
    };

    // Reset textarea height to initial state
    const resetTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = '48px'; // Reset to minimum height
            textarea.style.overflowY = 'hidden';
        }
    };

    // Handle input changes
    const handleInputChange = (e) => {
        setPrompt(e.target.value);
        // Delay height adjustment to ensure content is updated
        setTimeout(adjustTextareaHeight, 0);
    };

    // Adjust initial height after component mount
    useEffect(() => {
        if (prompt === '') {
            resetTextareaHeight();
        } else {
            adjustTextareaHeight();
        }
    }, [prompt]);

    const handleKeyDown = (e)=>{
        if(e.key === "Enter" && !e.shiftKey){
            e.preventDefault();
            sendPrompt(e);
        }
    }

    // Handle image upload
    const handleImageUpload = (files) => {
        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                toast.error('Only image files are allowed');
                return false;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toast.error('Image file cannot exceed 10MB');
                return false;
            }
            return true;
        });

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = {
                    id: Date.now() + Math.random(),
                    file,
                    url: e.target.result,
                    name: file.name
                };
                setUploadedImages(prev => [...prev, imageData]);
            };
            reader.readAsDataURL(file);
        });
    };

    // Handle file selection
    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleImageUpload(files);
        }
    };

    // Handle drag and drop
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleImageUpload(files);
        }
    };

    // Handle paste
    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        let hasImage = false;
        
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    handleImageUpload([file]);
                    hasImage = true;
                }
            }
        }
        
        // If no image, it's text paste, need to adjust height
        if (!hasImage) {
            setTimeout(() => {
                adjustTextareaHeight();
            }, 0);
        }
    };

    // Remove image
    const removeImage = (imageId) => {
        setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    };

    // Open file selector
    const openFileSelector = () => {
        fileInputRef.current?.click();
    };

    // Open image preview modal
    const openPreviewModal = (image) => {
        setPreviewModal({ isOpen: true, image });
    };

    // Close image preview modal
    const closePreviewModal = () => {
        setPreviewModal({ isOpen: false, image: null });
    };

    const sendPrompt = async (e)=>{
        e.preventDefault();
        
        const promptCopy = prompt;
        await sendPromptWithContent(e, promptCopy);
    }

    const sendPromptWithContent = async (e, contentToSend)=>{
        e.preventDefault();
        
        try {
            if(!user) return toast.error('Login to send message');
            if(isLoading) return toast.error('Wait for the previous prompt response');
            if(!contentToSend.trim()) return; // If no input content, do nothing
            
            // If no chat is selected, automatically create a new chat
            let currentChat = selectedChat;
            if(!currentChat) {
                setIsLoading(true);
                setPrompt(""); // Clear input to prevent duplicate submission
                
                try {
                    // Create new chat
                    const token = await getToken();
                    const chatData = selectedChatflow ? { chatflowId: selectedChatflow.id } : {};
                    
                    const createResponse = await axios.post('/api/chat/create', chatData, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (!createResponse.data.success) {
                        setIsLoading(false);
                        setPrompt(contentToSend); // Restore input content
                        return toast.error('Failed to create new chat. Please try again.');
                    }
                    
                    // Get newly created chat
                    const chatsResponse = await axios.get('/api/chat/get', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (chatsResponse.data.success && chatsResponse.data.data.length > 0) {
                        // Find the newly created chat (latest one)
                        const sortedChats = chatsResponse.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        let newChat;
                        
                        if (selectedChatflow) {
                            // If chatflow is selected, find the latest chat belonging to that chatflow
                            newChat = sortedChats.find(chat => chat.chatflowId === selectedChatflow.id);
                        } else {
                            // If no chatflow is selected, take the latest chat
                            newChat = sortedChats[0];
                        }
                        
                        if (newChat) {
                            currentChat = newChat;
                            // Update state but don't wait, continue sending message
                            setChats(chatsResponse.data.data);
                            setSelectedChat(newChat);
                        } else {
                            setIsLoading(false);
                            setPrompt(contentToSend);
                            return toast.error('Failed to find created chat.');
                        }
                    } else {
                        setIsLoading(false);
                        setPrompt(contentToSend);
                        return toast.error('Failed to retrieve chat after creation.');
                    }
                } catch (createError) {
                    setIsLoading(false);
                    setPrompt(contentToSend);
                    return toast.error('Failed to create new chat. Please try again.');
                }
            } else {
                setIsLoading(true);
                setPrompt("");
            }

            // Now send message
            const userPrompt = {
                role: "user",
                content: contentToSend,
                timestamp: Date.now(),
                images: uploadedImages.length > 0 ? uploadedImages.map(img => ({
                    name: img.name,
                    url: img.url
                })) : undefined
            }

            // saving user prompt in chats array
            setChats((prevChats)=> prevChats.map((chat)=> chat._id === currentChat._id ?
             {
                ...chat,
                messages: [...chat.messages, userPrompt]
            }: chat
        ))
        // saving user prompt in selected chat
        setSelectedChat((prev)=> ({
            ...prev,
            messages: [...prev.messages, userPrompt]
        }))

        // 准备发送数据，包括图片
        const sendData = {
            chatId: currentChat._id,
            prompt: contentToSend,
            images: uploadedImages.length > 0 ? uploadedImages.map(img => img.url) : undefined,
        };
        
        // 只有在选择了 chatflow 时才添加 chatflowId
        if (selectedChatflow?.id) {
            sendData.chatflowId = selectedChatflow.id;
        }

        const {data} = await axios.post('/api/chat/ai', sendData)

        if(data.success){
            const message = data.data.content;
            const messageTokens = message.split(" ");
            let assistantMessage = {
                role: 'assistant',
                content: "",
                timestamp: Date.now(),
            }

            // 如果后端返回了更新的聊天名称，更新相关状态
            if(data.chatName && data.chatName !== currentChat.name) {
                // 更新 chats 数组中的聊天名称
                setChats((prevChats)=>prevChats.map((chat)=>
                    chat._id === currentChat._id 
                        ? {...chat, messages: [...chat.messages, data.data], name: data.chatName} 
                        : chat
                ))
                // 更新当前选中的聊天名称
                setSelectedChat((prev) => ({
                    ...prev,
                    name: data.chatName,
                    messages: [...prev.messages, assistantMessage],
                }))
            } else {
                // 只更新消息，不更新名称
                setChats((prevChats)=>prevChats.map((chat)=>chat._id === currentChat._id ? {...chat, messages: [...chat.messages, data.data]} : chat))
                setSelectedChat((prev) => ({
                    ...prev,
                    messages: [...prev.messages, assistantMessage],
                }))
            }

            // 优化的streaming效果 - 修复state更新问题和添加清理机制
            const streamMessage = (fullContent) => {
                streamingRef.current = true; // 开始streaming
                const chars = fullContent.split('');
                let currentIndex = 0;
                const baseSpeed = 20; // 稍微慢一点，减少频繁更新
                
                const typeNextChunk = () => {
                    if (!streamingRef.current || currentIndex >= chars.length) {
                        streamingRef.current = false;
                        return;
                    }
                    
                    // 每次显示2-5个字符，减少更新频率
                    let chunkSize = 2;
                    const remainingChars = chars.length - currentIndex;
                    
                    if (remainingChars > 200) {
                        chunkSize = Math.min(5, remainingChars); // 长内容快速显示
                    } else if (remainingChars > 50) {
                        chunkSize = Math.min(3, remainingChars); // 中等内容适中显示
                    } else {
                        chunkSize = Math.min(2, remainingChars); // 短内容稍慢显示
                    }
                    
                    currentIndex += chunkSize;
                    const currentContent = chars.slice(0, currentIndex).join('');
                    
                    // 使用requestAnimationFrame来避免频繁的state更新
                    requestAnimationFrame(() => {
                        if (!streamingRef.current) return;
                        
                        setSelectedChat((prev) => {
                            if (!prev) return prev;
                            
                            const updatedMessages = [
                                ...prev.messages.slice(0, -1),
                                { ...assistantMessage, content: currentContent }
                            ];
                            return { ...prev, messages: updatedMessages };
                        });
                    });
                    
                    if (currentIndex < chars.length && streamingRef.current) {
                        // 动态速度调整
                        let delay = baseSpeed;
                        const currentChar = chars[currentIndex - 1];
                        
                        if (currentChar === '.' || currentChar === '!' || currentChar === '?') {
                            delay = baseSpeed * 2; // 句号后短暂停顿
                        } else if (currentChar === ',' || currentChar === ';') {
                            delay = baseSpeed * 1.5; // 逗号后轻微停顿
                        } else if (currentChar === ' ') {
                            delay = baseSpeed * 0.8; // 空格稍快
                        }
                        
                        // 代码块快速显示
                        if (currentContent.includes('```') && !currentContent.trim().endsWith('```')) {
                            delay = baseSpeed * 0.5;
                        }
                        
                        setTimeout(typeNextChunk, delay);
                    } else {
                        streamingRef.current = false;
                    }
                };
                
                // 开始显示
                setTimeout(typeNextChunk, 100); // 初始延迟
            };
            
            // 开始streaming
            streamMessage(message);

            // 清空上传的图片
            setUploadedImages([]);
        }else{
            toast.error(data.message);
            setPrompt(contentToSend);
        }

        } catch (error) {
            toast.error(error.message);
            setPrompt(contentToSend);
        } finally {
            setIsLoading(false);
        }
    }

  return (
    <div className={`w-full ${selectedChat?.messages.length > 0 ? "max-w-3xl" : "max-w-2xl"} transition-all`}>
      {/* 图片预览区域 */}
      {uploadedImages.length > 0 && (
        <div className="mb-3 p-3 bg-[#404045] rounded-2xl">
          <div className="flex flex-wrap gap-2">
            {uploadedImages.map((image) => (
              <div key={image.id} className="relative group">
                <img 
                  src={image.url} 
                  alt={image.name}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openPreviewModal(image)}
                />
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewModal.isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closePreviewModal}
        >
          <div 
            className="relative max-w-4xl max-h-4xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePreviewModal}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors z-10"
            >
              ×
            </button>
            <img 
              src={previewModal.image.url} 
              alt={previewModal.image.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
              {previewModal.image.name}
            </div>
          </div>
        </div>
      )}

      {/* 快捷短语按钮 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {quickPrompts
          .filter((item) => {
            // 如果是新聊天状态（没有选中聊天或消息为空），只显示"Let's learn"按钮
            const isNewChat = !selectedChat || !selectedChat.messages || selectedChat.messages.length === 0;
            if (isNewChat) {
              return item.text === "Let's learn";
            }
            // 如果不是新聊天状态，显示所有按钮
            return true;
          })
          .map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleQuickPrompt(item.content)}
            className="quick-prompt-btn flex items-center gap-1.5 px-4 py-2 bg-[#404045]/80 border border-gray-300/30 rounded-full hover:bg-gray-500/30 hover:border-gray-300/60 text-xs text-white/90 group min-w-[100px] justify-center"
          >
            {item.text === 'Good' && (
              <Image src={assets.like_icon} alt="" className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            )}
            {item.text === "Let's learn" && (
              <Image src={assets.arrow_icon} alt="" className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            )}
            {item.text === 'Please recommend' && (
              <span className="text-sm opacity-70 group-hover:opacity-100 transition-opacity">😊</span>
            )}
            {item.text === 'Please continue' && (
              <Image src={assets.regenerate_icon} alt="" className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            )}
            {item.text === 'Free to chat' && (
              <Image src={assets.chat_icon} alt="" className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            )}
            <span className="whitespace-nowrap font-medium">{item.text}</span>
          </button>
        ))}
      </div>

      <form onSubmit={sendPrompt}
       className={`w-full bg-[#404045] p-4 rounded-3xl mt-4 transition-all ${isDragging ? 'border-2 border-blue-500 border-dashed' : ''}`}
       onDragOver={handleDragOver}
       onDragLeave={handleDragLeave}
       onDrop={handleDrop}>
        
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <textarea
        ref={textareaRef}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className='outline-none w-full resize-none bg-transparent leading-6 text-sm placeholder:text-gray-400 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent textarea-smooth'
        style={{ 
            minHeight: '48px', // 2行的最小高度
            maxHeight: '192px', // 8行的最大高度
            overflowY: 'hidden',
            lineHeight: '24px',
            wordWrap: 'break-word',
            paddingRight: '8px' // 为滚动条留出空间
        }}
        placeholder={isDragging ? 'Drag images here to upload...' : 'Type a message or drag images here...'} 
        required 
        onChange={handleInputChange} 
        value={prompt}
        rows={2}/>

        <div className='flex items-center justify-between text-sm'>
            <div className='flex items-center gap-2'>
                <p className='flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition'>
                    <Image className='h-5' src={assets.search_icon} alt=''/>
                    Search
                </p>
            </div>

            <div className='flex items-center gap-2'>
            {/* 图片上传按钮 */}
            <button
              type="button"
              onClick={openFileSelector}
              className='w-4 cursor-pointer hover:opacity-70 transition-opacity'
              title="Upload Image"
            >
              <Image className='w-4' src={assets.pin_icon} alt='Upload Image'/>
            </button>
            
            <button 
                className={`${(prompt || uploadedImages.length > 0) && selectedChatflow ? "bg-primary" : "bg-[#71717a]"} rounded-full p-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={!selectedChatflow}
                title={!selectedChatflow ? "Please select a chatflow first" : ""}
            >
                <Image 
                    className='w-3.5 aspect-square' 
                    src={(prompt || uploadedImages.length > 0) && selectedChatflow ? assets.arrow_icon : assets.arrow_icon_dull} 
                    alt=''
                />
            </button>
            </div>
        </div>
    </form>
    </div>
  )
}

export default PromptBox
