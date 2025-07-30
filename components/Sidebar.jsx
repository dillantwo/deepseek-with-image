import { assets } from '@/assets/assets'
import Image from 'next/image'
import React, { useState } from 'react'
import { useClerk, UserButton } from '@clerk/nextjs'
import { useAppContext } from '@/context/AppContext'
import ChatLabel from './ChatLabel'

const Sidebar = ({expand, setExpand}) => {

    const {openSignIn} = useClerk()
    const {user, filteredChats, selectedChatflow, createNewChat} = useAppContext()
    const [openMenu, setOpenMenu] = useState({id: 0, open: false})

  return (
    <div className={`flex flex-col justify-between bg-[#212327] pt-7 transition-all z-50 max-md:absolute max-md:h-screen overflow-hidden ${expand ? 'p-4 w-64 min-w-64' : 'md:w-20 w-0 max-md:overflow-hidden'}`}>
      <div className="flex flex-col min-h-0 flex-1">
        <div className={`flex ${expand ? "flex-row gap-10" : "flex-col items-center gap-8"}`}>
            <Image className={expand ? "w-36" : "w-10"} src={expand ? assets.logo_text : assets.reshot_icon} alt=''/>

            <div onClick={()=> expand ? setExpand(false) : setExpand(true)}
             className='group relative flex items-center justify-center hover:bg-gray-500/20 transition-all duration-300 h-9 w-9 aspect-square rounded-lg cursor-pointer'>
                <Image src={assets.menu_icon} alt='' className='md:hidden'/>
                <Image src={expand ? assets.sidebar_close_icon : assets.sidebar_icon} alt='' className='hidden md:block w-7'/>
                <div className={`absolute w-max ${expand ? "left-1/2 -translate-x-1/2 top-12" : "-top-12 left-0"} opacity-0 group-hover:opacity-100 transition bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none`}>
                    {expand ? 'Close sidebar' : 'Open sidebar'}
                    <div className={`w-3 h-3 absolute bg-black rotate-45 ${expand ? "left-1/2 -top-1.5 -translate-x-1/2" : "left-4 -bottom-1.5"}`}></div>
                </div>
            </div>
        </div>

        <button onClick={createNewChat} className={`mt-8 flex items-center justify-center cursor-pointer ${expand ? "bg-primary hover:opacity-90 rounded-2xl gap-2 p-2.5 w-max" : "group relative h-9 w-9 mx-auto hover:bg-gray-500/30 rounded-lg"}`}>
            <Image className={expand ? 'w-6' : 'w-7'} src={expand ? assets.chat_icon : assets.chat_icon_dull} alt=''/>
            <div className='absolute w-max -top-12 -right-12 opacity-0 group-hover:opacity-100 transition bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none'>
                New chat
                <div className='w-3 h-3 absolute bg-black rotate-45 left-4 -bottom-1.5'></div>
            </div>
            {expand && <p className='text-white text font-medium'>New chat</p>}
        </button>

        <div className={`mt-8 text-white/25 text-sm flex-1 flex flex-col min-h-0 ${expand ? "block" : "hidden"}`}>
            {/* 显示当前 chatflow 名称 */}
            {selectedChatflow && (
                <div className="mb-4 p-3 bg-[#2a2b2f] rounded-lg border border-gray-600/30 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${selectedChatflow.deployed ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <p className="text-white text-sm font-medium truncate">{selectedChatflow.name}</p>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{selectedChatflow.category}</p>
                </div>
            )}
            
            <p className='my-1 flex-shrink-0'>
                {selectedChatflow ? `${selectedChatflow.name} Chats` : 'Recent Chats'}
            </p>
            <div className="flex-1 chat-list-container min-h-0 pr-2">
                {filteredChats.length > 0 ? (
                    filteredChats.map((chat, index)=> 
                        <ChatLabel key={index} name={chat.name} id={chat._id} openMenu={openMenu} setOpenMenu={setOpenMenu}/>
                    )
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-400 text-sm mb-2">
                            {selectedChatflow 
                                ? `No chats for ${selectedChatflow.name}` 
                                : 'No chats available'
                            }
                        </p>
                        <p className="text-gray-500 text-xs">
                            {selectedChatflow 
                                ? 'Start a new conversation with this chatflow' 
                                : 'Create your first chat to get started'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>

    <div className="flex-shrink-0">
        <div onClick={user ? null : openSignIn}
         className={`flex items-center ${expand ? ' hover:bg-white/10 rounded-lg' : 'justify-center w-full'} gap-3 text-white/60 text-sm p-2 cursor-pointer`}>
            {
                user ? <UserButton/>
                : <Image src={assets.profile_icon} alt='' className='w-7'/>
            }
            
            {expand && <span>My Profile</span>}
        </div>
    </div>

    </div>
  )
}

export default Sidebar
