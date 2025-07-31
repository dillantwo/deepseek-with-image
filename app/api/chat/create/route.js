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
        
        // Get chatflowId from request body
        const body = await req.json();
        const { chatflowId } = body;

        // Prepare the chat data to be saved in the database
        const chatData = {
            userId,
            messages: [],
            name: "New Chat", // Keep default name, will be updated on first conversation
            chatflowId: chatflowId || null, // If chatflowId is provided, associate with that chatflow
        };

        // Connect to the database and create a new chat
        await connectDB();
        await Chat.create(chatData);

        return NextResponse.json({ success: true, message: "Chat created" })

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message });
    }
}