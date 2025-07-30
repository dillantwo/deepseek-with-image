"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = ()=>{
    return useContext(AppContext)
}

export const AppContextProvider = ({children})=>{
    const {user} = useUser()
    const {getToken} = useAuth()

    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [selectedChatflow, setSelectedChatflow] = useState(null);
    const [filteredChats, setFilteredChats] = useState([]);

    const createNewChat = async ()=>{
        try {
            if(!user) return null;

            const token = await getToken();

            // 创建新聊天时关联到当前选中的 chatflow
            const chatData = selectedChatflow ? { chatflowId: selectedChatflow.id } : {};

            const response = await axios.post('/api/chat/create', chatData, {headers:{
                Authorization: `Bearer ${token}`
            }})

            if(response.data.success) {
                await fetchUsersChats();
                return true; // 返回成功标识
            }
            return false;
        } catch (error) {
            toast.error(error.message)
            return false;
        }
    }

    const fetchUsersChats = async ()=>{
        try {
            const token = await getToken();
            const {data} = await axios.get('/api/chat/get', {headers:{
                Authorization: `Bearer ${token}`
            }})
            if(data.success){
                console.log(data.data);
                setChats(data.data)

                 // If the user has no chats, create one
                 if(data.data.length === 0){
                    // 当没有聊天时，清空选中的聊天
                    setSelectedChat(null);
                    
                    // 可选：根据是否选择了 chatflow 来决定是否自动创建聊天
                    // 这里我们不自动创建，让用户手动触发创建
                    /*
                    try {
                        await createNewChat();
                        // 重新获取聊天列表，但添加防护避免无限递归
                        const newData = await axios.get('/api/chat/get', {headers:{
                            Authorization: `Bearer ${token}`
                        }});
                        if(newData.data.success && newData.data.data.length > 0) {
                            setChats(newData.data.data);
                            setSelectedChat(newData.data.data[0]);
                        }
                    } catch (createError) {
                        console.error('Failed to create initial chat:', createError);
                        // 如果创建聊天失败，不要再次尝试
                    }
                    */
                 }else{
                    // sort chats by updated date
                    data.data.sort((a, b)=> new Date(b.updatedAt) - new Date(a.updatedAt));

                     // 如果有选中的 chatflow，优先选择该 chatflow 下的聊天
                     if(selectedChatflow) {
                        const chatflowChats = data.data.filter(chat => chat.chatflowId === selectedChatflow.id);
                        if(chatflowChats.length > 0) {
                            setSelectedChat(chatflowChats[0]);
                        } else {
                            // 如果当前 chatflow 没有聊天，检查当前选中的聊天是否还存在
                            const stillExists = data.data.find(chat => chat._id === selectedChat?._id);
                            if (!stillExists) {
                                setSelectedChat(null);
                            }
                        }
                     } else {
                        // 如果没有选中 chatflow，检查当前选中的聊天是否还存在
                        const stillExists = data.data.find(chat => chat._id === selectedChat?._id);
                        if (stillExists) {
                            // 如果当前选中的聊天仍然存在，保持选中
                            setSelectedChat(stillExists);
                        } else {
                            // 如果当前选中的聊天不存在了，选择最新的
                            setSelectedChat(data.data[0]);
                        }
                     }
                     console.log(data.data[0]);
                 }
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

 useEffect(()=>{
    if(user){
        fetchUsersChats();
    }
 }, [user])

 // 根据选中的 chatflow 过滤聊天记录
 useEffect(() => {
    if (selectedChatflow) {
        const filtered = chats.filter(chat => chat.chatflowId === selectedChatflow.id);
        setFilteredChats(filtered);
        
        // 如果当前选中的聊天不属于新的 chatflow，自动选择第一个匹配的聊天
        if (selectedChat && selectedChat.chatflowId !== selectedChatflow.id) {
            if (filtered.length > 0) {
                setSelectedChat(filtered[0]);
            } else {
                setSelectedChat(null);
            }
        } else if (!selectedChat && filtered.length > 0) {
            // 如果没有选中聊天但有匹配的聊天，选择第一个
            setSelectedChat(filtered[0]);
        }
    } else {
        // 如果没有选中 chatflow，显示所有聊天（包括没有关联 chatflow 的旧聊天）
        setFilteredChats(chats);
        
        // 如果没有选中聊天且有聊天记录，选择最新的
        if (!selectedChat && chats.length > 0) {
            setSelectedChat(chats[0]);
        }
    }
 }, [selectedChatflow, chats]);

 // 处理 chatflow 切换
 const handleChatflowChange = async (newChatflow) => {
    setSelectedChatflow(newChatflow);
    
    // 检查新 chatflow 是否有聊天记录
    const chatflowChats = chats.filter(chat => chat.chatflowId === newChatflow.id);
    
    // 如果新 chatflow 没有聊天记录，自动创建一个
    if (chatflowChats.length === 0) {
        try {
            if (user) {
                const token = await getToken();
                const chatData = { chatflowId: newChatflow.id };
                
                const response = await axios.post('/api/chat/create', chatData, {headers:{
                    Authorization: `Bearer ${token}`
                }});
                
                if (response.data.success) {
                    // 重新获取聊天列表
                    fetchUsersChats();
                    toast.success(`New chat created for ${newChatflow.name}`);
                }
            }
        } catch (error) {
            console.error('Failed to create chat for new chatflow:', error);
        }
    }
 };

    const value = {
        user,
        chats,
        setChats,
        selectedChat,
        setSelectedChat,
        selectedChatflow,
        setSelectedChatflow,
        filteredChats,
        fetchUsersChats,
        createNewChat,
        handleChatflowChange
    }
    
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}