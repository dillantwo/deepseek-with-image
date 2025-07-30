import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req){
    try {
        const { userId } = getAuth(req)

        if(!userId){
            return NextResponse.json({success: false, message: "User not authenticated",})
        }
        
        // 获取请求体中的 chatflowId
        const body = await req.json();
        const { chatflowId } = body;

        // Prepare the chat data to be saved in the database
        const chatData = {
            userId,
            messages: [],
            name: "New Chat", // 保持默认名称，将在第一次对话时更新
            chatflowId: chatflowId || null, // 如果提供了 chatflowId，则关联到该 chatflow
        };

        // Connect to the database and create a new chat
        await connectDB();
        await Chat.create(chatData);

        return NextResponse.json({ success: true, message: "Chat created" })

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message });
    }
}