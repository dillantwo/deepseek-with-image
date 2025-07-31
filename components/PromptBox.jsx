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
    const streamingRef = useRef(false); // 跟踪streaming状态
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const {user, chats, setChats, selectedChat, setSelectedChat, selectedChatflow, setSelectedChatflow, createNewChat} = useAppContext();
    const {getToken} = useAuth();

    // 预设的快捷短语
    const quickPrompts = [
        { text: 'Good', content: 'Good! ' },
        { text: "Let's learn", content: "Let's learn！" },
        { text: 'Please recommend', content: 'Please recommend！' }
    ];

    // 处理快捷短语点击 - 直接发送消息
    const handleQuickPrompt = async (content) => {
        // 创建一个模拟的事件对象用于sendPrompt函数
        const mockEvent = {
            preventDefault: () => {}
        };
        
        // 临时设置prompt为快捷短语内容
        const originalPrompt = prompt;
        setPrompt(content);
        
        // 等待一个微任务，确保状态更新
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // 直接调用sendPrompt发送消息
        try {
            await sendPromptWithContent(mockEvent, content);
        } catch (error) {
            // 如果发送失败，恢复原始prompt
            setPrompt(originalPrompt);
        }
    };

    // 清理streaming状态
    useEffect(() => {
        return () => {
            streamingRef.current = false;
        };
    }, []);

    // 自动调整textarea高度
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            // 重置高度以获得正确的scrollHeight
            textarea.style.height = 'auto';
            
            // 计算内容高度
            const scrollHeight = textarea.scrollHeight;
            const lineHeight = 24; // 每行的高度
            const minHeight = lineHeight * 2; // 最小2行
            const maxHeight = lineHeight * 8; // 最大8行
            
            // 设置高度，但不超过最大值
            const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
            textarea.style.height = `${newHeight}px`;
            
            // 如果内容超过最大高度，启用滚动
            if (scrollHeight > maxHeight) {
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.overflowY = 'hidden';
            }
        }
    };

    // 重置textarea高度到初始状态
    const resetTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = '48px'; // 重置为最小高度
            textarea.style.overflowY = 'hidden';
        }
    };

    // 处理输入变化
    const handleInputChange = (e) => {
        setPrompt(e.target.value);
        // 延迟调整高度，确保内容已更新
        setTimeout(adjustTextareaHeight, 0);
    };

    // 在组件挂载后调整初始高度
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

    // 处理图片上传
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

    // 处理文件选择
    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleImageUpload(files);
        }
    };

    // 处理拖拽
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

    // 处理粘贴
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
        
        // 如果没有图片，说明是文本粘贴，需要调整高度
        if (!hasImage) {
            setTimeout(() => {
                adjustTextareaHeight();
            }, 0);
        }
    };

    // 移除图片
    const removeImage = (imageId) => {
        setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    };

    // 打开文件选择器
    const openFileSelector = () => {
        fileInputRef.current?.click();
    };

    // 打开图片预览模态框
    const openPreviewModal = (image) => {
        setPreviewModal({ isOpen: true, image });
    };

    // 关闭图片预览模态框
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
            if(!contentToSend.trim()) return; // 如果没有输入内容，不执行任何操作
            
            // 如果没有选中聊天，自动创建一个新聊天
            let currentChat = selectedChat;
            if(!currentChat) {
                setIsLoading(true);
                setPrompt(""); // 清空输入框，防止重复提交
                
                try {
                    // 创建新聊天
                    const token = await getToken();
                    const chatData = selectedChatflow ? { chatflowId: selectedChatflow.id } : {};
                    
                    const createResponse = await axios.post('/api/chat/create', chatData, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (!createResponse.data.success) {
                        setIsLoading(false);
                        setPrompt(contentToSend); // 恢复输入内容
                        return toast.error('Failed to create new chat. Please try again.');
                    }
                    
                    // 获取新创建的聊天
                    const chatsResponse = await axios.get('/api/chat/get', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (chatsResponse.data.success && chatsResponse.data.data.length > 0) {
                        // 找到刚创建的聊天（最新的）
                        const sortedChats = chatsResponse.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        let newChat;
                        
                        if (selectedChatflow) {
                            // 如果有选中的 chatflow，找到属于该 chatflow 的最新聊天
                            newChat = sortedChats.find(chat => chat.chatflowId === selectedChatflow.id);
                        } else {
                            // 如果没有选中 chatflow，取最新的聊天
                            newChat = sortedChats[0];
                        }
                        
                        if (newChat) {
                            currentChat = newChat;
                            // 更新状态但不等待，继续发送消息
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

            // 现在发送消息
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
        {quickPrompts.map((item, index) => (
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
        placeholder={isDragging ? '拖拽图片到这里上传...' : '输入消息或拖拽图片到这里...'} 
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
