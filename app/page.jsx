'use client';
import { assets } from "@/assets/assets";
import Message from "@/components/Message";
import PromptBox from "@/components/PromptBox";
import Sidebar from "@/components/Sidebar";
import ChatflowSelector from "@/components/ChatflowSelector";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function Home() {

  const [expand, setExpand] = useState(false)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const {selectedChat, selectedChatflow, handleChatflowChange} = useAppContext()
  const containerRef = useRef(null)

  useEffect(()=>{
    if(selectedChat){
      setMessages(selectedChat.messages)
    } else {
      setMessages([]) // Clear messages when no chat is selected
    }
  },[selectedChat])

  useEffect(()=>{
    if(containerRef.current){
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  },[messages])



  return (
    <div>
      <div className="flex h-screen">
        <Sidebar expand={expand} setExpand={setExpand}/>
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 bg-[#292a2d] text-white relative">
          {/* Mobile top navigation */}
          <div className="md:hidden absolute px-4 top-6 flex items-center justify-between w-full">
            <Image onClick={()=> (expand ? setExpand(false) : setExpand(true))}
             className="rotate-180" src={assets.menu_icon} alt=""/>
            <Image className="opacity-70" src={assets.chat_icon} alt=""/>
          </div>

          {/* Desktop ChatflowSelector */}
          <div className="hidden md:block absolute top-6 left-6 z-10">
            <ChatflowSelector 
              selectedChatflow={selectedChatflow} 
              onChatflowChange={handleChatflowChange} 
            />
          </div>

          {/* Mobile ChatflowSelector */}
          <div className="md:hidden absolute top-16 left-4 right-4 z-10">
            <ChatflowSelector 
              selectedChatflow={selectedChatflow} 
              onChatflowChange={handleChatflowChange} 
            />
          </div>

          {messages.length === 0 || !selectedChat ? (
            <div className="mt-16 md:mt-0">
            <div className="flex items-center gap-3">
              <Image src={assets.reshot_icon} alt="" className="h-10"/>
              <p className="text-2xl font-medium">Hi, I'm FirstChat.</p>
            </div>
            <p className="text-sm mt-2 ml-13">
              {selectedChatflow 
                ? `How can I help you with ${selectedChatflow.name}?` 
                : 'How can I help you today?'
              }
            </p>
            </div>
          ):
          (
          <div ref={containerRef}
          className="relative flex flex-col items-center justify-start w-full mt-32 md:mt-20 max-h-screen overflow-y-auto"
          > 
          <p className="fixed top-20 md:top-8 border border-transparent hover:border-gray-500/50 py-1 px-2 rounded-lg font-semibold mb-6">
            {(selectedChat?.name || 'No Chat Selected').length > 8 
              ? (selectedChat?.name || 'No Chat Selected').substring(0, 8) + '...' 
              : (selectedChat?.name || 'No Chat Selected')}
            {selectedChatflow && (
              <span className="text-xs text-gray-400 ml-2">• {selectedChatflow.name}</span>
            )}
          </p>
          {messages.map((msg, index)=>(
            <Message key={index} role={msg.role} content={msg.content} images={msg.images}/>
          ))}
          {
            isLoading && (
              <div className="flex gap-4 max-w-3xl w-full py-3">
                <Image className="h-9 w-9 p-1 border border-white/15 rounded-full"
                 src={assets.reshot_icon} alt="Logo"/>
                 <div className="loader flex justify-center items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-white animate-bounce"></div>
                  <div className="w-1 h-1 rounded-full bg-white animate-bounce"></div>
                  <div className="w-1 h-1 rounded-full bg-white animate-bounce"></div>
                 </div>
              </div>
            )
          }
            
          </div>
        )
        }
        <PromptBox isLoading={isLoading} setIsLoading={setIsLoading}/>
        <p className="text-xs absolute bottom-1 text-gray-500">AI-generated, for reference only</p>

        </div>
      </div>
    </div>
  );
}
