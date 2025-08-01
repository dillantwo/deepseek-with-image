import { assets } from '@/assets/assets'
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@clerk/nextjs';
import { useClerk } from '@clerk/nextjs';
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
    const [isListening, setIsListening] = useState(false);
    const [speechRecognition, setSpeechRecognition] = useState(null);
    const streamingRef = useRef(false); // Track streaming status
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const {user, chats, setChats, selectedChat, setSelectedChat, selectedChatflow, setSelectedChatflow, createNewChat} = useAppContext();
    const {getToken} = useAuth();
    const {openSignIn} = useClerk();

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

    // Clean up streaming status and speech recognition
    useEffect(() => {
        return () => {
            streamingRef.current = false;
            // Clean up speech recognition
            if (speechRecognition && isListening) {
                speechRecognition.stop();
                setIsListening(false);
            }
        };
    }, [speechRecognition, isListening]);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true; // Enable continuous recognition
                recognition.interimResults = true; // Show interim results
                recognition.maxAlternatives = 1;
                recognition.lang = 'zh-yue-HK'; // Default Cantonese
                
                recognition.onstart = () => {
                    setIsListening(true);
                    console.log('Speech recognition started, current language:', recognition.lang);
                };
                
                recognition.onresult = (event) => {
                    let finalTranscript = '';
                    let interimTranscript = '';
                    
                    // Process all recognition results
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript;
                        } else {
                            interimTranscript += transcript;
                        }
                    }
                    
                    // Only update input box when there's final result
                    if (finalTranscript) {
                        console.log('Final recognition result:', finalTranscript);
                        setPrompt(prev => prev + finalTranscript + ' ');
                        setTimeout(adjustTextareaHeight, 0);
                    }
                    
                    // Can display interim results here (optional)
                    if (interimTranscript) {
                        console.log('Interim result:', interimTranscript);
                    }
                };
                
                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    
                    if (event.error === 'not-allowed') {
                        setIsListening(false);
                        toast.error('Please allow microphone access permission');
                    } else if (event.error === 'network') {
                        setIsListening(false);
                        toast.error('Network error, please check network connection');
                    } else if (event.error === 'language-not-supported') {
                        // If Cantonese is not supported, automatically switch to English
                        console.log('Cantonese not supported, switching to English');
                        recognition.lang = 'en-US';
                        toast.error('Cantonese recognition not supported, switched to English recognition');
                    } else if (event.error === 'no-speech') {
                        // No speech detected, no need to stop in continuous mode
                        console.log('No speech detected, continue waiting...');
                    } else if (event.error === 'aborted') {
                        // User manually stopped, don't show error
                        console.log('Speech recognition stopped by user');
                    } else {
                        // Other errors, try to restart (if still in listening state)
                        console.log('Speech recognition error, trying to restart:', event.error);
                        if (isListening) {
                            setTimeout(() => {
                                if (isListening) {
                                    try {
                                        recognition.start();
                                    } catch (e) {
                                        console.log('Failed to restart speech recognition:', e);
                                    }
                                }
                            }, 1000);
                        }
                    }
                };
                
                recognition.onend = () => {
                    console.log('Speech recognition ended');
                    // In continuous mode, if still in listening state, automatically restart
                    if (isListening) {
                        console.log('Auto restarting speech recognition...');
                        setTimeout(() => {
                            if (isListening) {
                                try {
                                    recognition.start();
                                } catch (e) {
                                    console.log('Failed to restart speech recognition:', e);
                                    setIsListening(false);
                                }
                            }
                        }, 100);
                    }
                };
                
                setSpeechRecognition(recognition);
            } else {
                console.warn('Browser does not support speech recognition feature');
            }
        }
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

    // Handle speech recognition
    const handleSpeechRecognition = () => {
        if (!speechRecognition) {
            toast.error('Your browser does not support speech recognition feature');
            return;
        }
        
        if (isListening) {
            // Stop speech recognition
            console.log('User manually stopped speech recognition');
            setIsListening(false);
            speechRecognition.stop();
        } else {
            // Start speech recognition
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    console.log('Starting continuous speech recognition');
                    speechRecognition.lang = 'zh-yue-HK';
                    setIsListening(true);
                    speechRecognition.start();
                })
                .catch((error) => {
                    console.error('Microphone permission denied:', error);
                    toast.error('Please allow microphone access permission');
                });
        }
    };

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
            if(!user) {
                openSignIn();
                return;
            }
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

        // Prepare data to send, including images
        const sendData = {
            chatId: currentChat._id,
            prompt: contentToSend,
            images: uploadedImages.length > 0 ? uploadedImages.map(img => img.url) : undefined,
        };
        
        // Only add chatflowId when a chatflow is selected
        if (selectedChatflow?.id) {
            sendData.chatflowId = selectedChatflow.id;
        }        const {data} = await axios.post('/api/chat/ai', sendData)

        if(data.success){
            const message = data.data.content;
            const messageTokens = message.split(" ");
            let assistantMessage = {
                role: 'assistant',
                content: "",
                timestamp: Date.now(),
            }

            // If backend returned updated chat name, update related state
            if(data.chatName && data.chatName !== currentChat.name) {
                // Update chat name in chats array
                setChats((prevChats)=>prevChats.map((chat)=>
                    chat._id === currentChat._id 
                        ? {...chat, messages: [...chat.messages, data.data], name: data.chatName} 
                        : chat
                ))
                // Update currently selected chat name
                setSelectedChat((prev) => ({
                    ...prev,
                    name: data.chatName,
                    messages: [...prev.messages, assistantMessage],
                }))
            } else {
                // Only update messages, not name
                setChats((prevChats)=>prevChats.map((chat)=>chat._id === currentChat._id ? {...chat, messages: [...chat.messages, data.data]} : chat))
                setSelectedChat((prev) => ({
                    ...prev,
                    messages: [...prev.messages, assistantMessage],
                }))
            }

            // Optimized streaming effect - fix state update issues and add cleanup mechanism
            const streamMessage = (fullContent) => {
                streamingRef.current = true; // Start streaming
                const chars = fullContent.split('');
                let currentIndex = 0;
                const baseSpeed = 20; // Slightly slower to reduce frequent updates
                
                const typeNextChunk = () => {
                    if (!streamingRef.current || currentIndex >= chars.length) {
                        streamingRef.current = false;
                        return;
                    }
                    
                    // Display 2-5 characters at a time to reduce update frequency
                    let chunkSize = 2;
                    const remainingChars = chars.length - currentIndex;
                    
                    if (remainingChars > 200) {
                        chunkSize = Math.min(5, remainingChars); // Fast display for long content
                    } else if (remainingChars > 50) {
                        chunkSize = Math.min(3, remainingChars); // Medium display for medium content
                    } else {
                        chunkSize = Math.min(2, remainingChars); // Slower display for short content
                    }
                    
                    currentIndex += chunkSize;
                    const currentContent = chars.slice(0, currentIndex).join('');
                    
                    // Use requestAnimationFrame to avoid frequent state updates
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
                        // Dynamic speed adjustment
                        let delay = baseSpeed;
                        const currentChar = chars[currentIndex - 1];
                        
                        if (currentChar === '.' || currentChar === '!' || currentChar === '?') {
                            delay = baseSpeed * 2; // Brief pause after period
                        } else if (currentChar === ',' || currentChar === ';') {
                            delay = baseSpeed * 1.5; // Light pause after comma
                        } else if (currentChar === ' ') {
                            delay = baseSpeed * 0.8; // Slightly faster for spaces
                        }
                        
                        // Fast display for code blocks
                        if (currentContent.includes('```') && !currentContent.trim().endsWith('```')) {
                            delay = baseSpeed * 0.5;
                        }
                        
                        setTimeout(typeNextChunk, delay);
                    } else {
                        streamingRef.current = false;
                    }
                };
                
                // Start displaying
                setTimeout(typeNextChunk, 100); // Initial delay
            };
            
            // Start streaming
            streamMessage(message);

            // Clear uploaded images
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
      {/* Image preview area */}
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

      {/* Image preview modal */}
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

      {/* Quick phrase buttons */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {quickPrompts
          .filter((item) => {
            // For new chat state (no selected chat or empty messages), only show "Let's learn" button
            const isNewChat = !selectedChat || !selectedChat.messages || selectedChat.messages.length === 0;
            if (isNewChat) {
              return item.text === "Let's learn";
            }
            // For non-new chat state, show all buttons
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
            minHeight: '48px', // Minimum height for 2 lines
            maxHeight: '192px', // Maximum height for 8 lines
            overflowY: 'hidden',
            lineHeight: '24px',
            wordWrap: 'break-word',
            paddingRight: '8px' // Leave space for scrollbar
        }}
        placeholder={isDragging ? 'Drag images here to upload...' : isListening ? 'Continuous listening...' : 'Type a message, drag images, or use voice input...'} 
        required 
        onChange={handleInputChange} 
        value={prompt}
        rows={2}/>

        <div className='flex items-center justify-between text-sm'>
            <div className='flex items-center gap-2'>
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
            
            {/* Voice recognition button */}
            <button
              type="button"
              onClick={handleSpeechRecognition}
              className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' 
                  : 'hover:bg-gray-600/30'
              }`}
              title={isListening ? "Click to stop continuous recording" : "Click to start continuous voice input (supports Cantonese and English)"}
            >
              <Image 
                className={`w-4 transition-all ${isListening ? 'brightness-0 invert' : ''}`}
                src={assets.phone_icon} 
                alt='Voice Input'
              />
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
