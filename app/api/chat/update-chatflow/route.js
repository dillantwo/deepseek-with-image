import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PUT(req) {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "User not authenticated",
            });
        }

        const body = await req.json();
        const { chatId, chatflowId } = body;

        if (!chatId) {
            return NextResponse.json({
                success: false,
                message: "Chat ID is required",
            });
        }

        // Connect to the database and update the chat
        await connectDB();
        
        const updatedChat = await Chat.findOneAndUpdate(
            { _id: chatId, userId }, // 确保只能更新属于当前用户的聊天
            { chatflowId: chatflowId || null },
            { new: true }
        );

        if (!updatedChat) {
            return NextResponse.json({
                success: false,
                message: "Chat not found or unauthorized",
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: "Chat chatflow updated successfully",
            data: updatedChat
        });

    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        });
    }
}
