import { assets } from '@/assets/assets'
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import Image from 'next/image'
import React, { useState, useRef } from 'react'
import toast from 'react-hot-toast';

const PromptBox = ({setIsLoading, isLoading}) => {

    const [prompt, setPrompt] = useState('');
    const [uploadedImages, setUploadedImages] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [previewModal, setPreviewModal] = useState({ isOpen: false, image: null });
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const {user, chats, setChats, selectedChat, setSelectedChat} = useAppContext();

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
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    handleImageUpload([file]);
                }
            }
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
        const promptCopy = prompt;

        try {
            e.preventDefault();
            if(!user) return toast.error('Login to send message');
            if(isLoading) return toast.error('Wait for the previous prompt response');

            setIsLoading(true)
            setPrompt("")

            const userPrompt = {
                role: "user",
                content: prompt,
                timestamp: Date.now(),
                images: uploadedImages.length > 0 ? uploadedImages.map(img => ({
                    name: img.name,
                    url: img.url
                })) : undefined
            }

            // saving user prompt in chats array

            setChats((prevChats)=> prevChats.map((chat)=> chat._id === selectedChat._id ?
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
            chatId: selectedChat._id,
            prompt,
            images: uploadedImages.length > 0 ? uploadedImages.map(img => img.url) : undefined
        };

        const {data} = await axios.post('/api/chat/ai', sendData)

        if(data.success){
            setChats((prevChats)=>prevChats.map((chat)=>chat._id === selectedChat._id ? {...chat, messages: [...chat.messages, data.data]} : chat))

            const message = data.data.content;
            const messageTokens = message.split(" ");
            let assistantMessage = {
                role: 'assistant',
                content: "",
                timestamp: Date.now(),
            }

            setSelectedChat((prev) => ({
                ...prev,
                messages: [...prev.messages, assistantMessage],
            }))

            for (let i = 0; i < messageTokens.length; i++) {
               setTimeout(()=>{
                assistantMessage.content = messageTokens.slice(0, i + 1).join(" ");
                setSelectedChat((prev)=>{
                    const updatedMessages = [
                        ...prev.messages.slice(0, -1),
                        assistantMessage
                    ]
                    return {...prev, messages: updatedMessages}
                })
               }, i * 100)
                
            }

            // 清空上传的图片
            setUploadedImages([]);
        }else{
            toast.error(data.message);
            setPrompt(promptCopy);
        }

        } catch (error) {
            toast.error(error.message);
            setPrompt(promptCopy);
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
        className='outline-none w-full resize-none overflow-hidden break-words bg-transparent'
        rows={2}
        placeholder={isDragging ? 'Drop to upload images...' : 'Type a message or drag images here...'} 
        required 
        onChange={(e)=> setPrompt(e.target.value)} 
        value={prompt}/>

        <div className='flex items-center justify-between text-sm'>
            <div className='flex items-center gap-2'>
                <p className='flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition'>
                    <Image className='h-5' src={assets.deepthink_icon} alt=''/>
                    DeepThink (R1)
                </p>
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
            
            <button className={`${prompt || uploadedImages.length > 0 ? "bg-primary" : "bg-[#71717a]"} rounded-full p-2 cursor-pointer`}>
                <Image className='w-3.5 aspect-square' src={prompt || uploadedImages.length > 0 ? assets.arrow_icon : assets.arrow_icon_dull} alt=''/>
            </button>
            </div>
        </div>
    </form>
    </div>
  )
}

export default PromptBox
