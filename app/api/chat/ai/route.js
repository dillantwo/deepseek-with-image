export const maxDuration = 60;
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
// import { AzureOpenAI } from "openai";

// Flowise API configuration
const FLOWISE_API_URL = "http://104.214.171.154/api/v1/prediction/467dc088-1ac6-4301-a19e-401c393898f9";

// Helper function to query Flowise API
async function queryFlowise(data) {
    const response = await fetch(FLOWISE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`Flowise API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
}


// const endpoint = "https://for-fivesubject.openai.azure.com/";
// const modelName = "gpt-4o";
// const deployment = "gpt-4o";
//   const apiKey = "AyETaj9ypfB5L4MyJ36SLHQWP0VfSFPQ2wXFdk1cItOrePuHZvlVJQQJ99BGACYeBjFXJ3w3AAABACOGgSgE";
//   const apiVersion = "2024-04-01-preview";
//   const options = { endpoint, apiKey, deployment, apiVersion }

// // Initialize OpenAI client with DeepSeek API key and base URL
// const openai = new AzureOpenAI(options);

export async function POST(req){
    try {
        const {userId} = getAuth(req)

        // Extract chatId, prompt, and images from the request body
        const { chatId, prompt, images } = await req.json();

        console.log('Received request:', { userId, chatId, prompt, imagesCount: images?.length });

        if(!userId){
            return NextResponse.json({
                success: false,
                message: "User not authenticated",
              });
        }

        if(!prompt?.trim()){
            return NextResponse.json({
                success: false,
                message: "Prompt is required",
              });
        }

        // Find the chat document in the database based on userId and chatId
        await connectDB()
        const data = await Chat.findOne({userId, _id: chatId})

        if(!data){
            return NextResponse.json({
                success: false,
                message: "Chat not found",
              });
        }

        // Create a user message object
        const userPrompt = {
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            ...(images && images.length > 0 && { images: images.map((img, index) => ({
                name: `Image ${index + 1}`,
                url: img
            }))})
        };

        data.messages.push(userPrompt);

        // Prepare messages for API call
        let apiMessages = [];
        
        if (images && images.length > 0) {
            // If images are present, create a message with both text and images
            const content = [
                { type: "text", text: prompt }
            ];
            
            // Add each image to the content
            images.forEach(imageUrl => {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: imageUrl,
                        detail: "high"
                    }
                });
            });
            
            apiMessages = [{ role: "user", content: content }];
        } else {
            // Text-only message
            apiMessages = [{ role: "user", content: prompt }];
        }

        // Call the Flowise API to get a chat completion
        const requestData = {
            question: prompt,
            // 如果有图片，按照正确的格式传递
            ...(images && images.length > 0 && { 
                uploads: images.map((img, index) => {
                    const upload = {
                        data: img, // 应该是 base64 字符串或 URL
                        type: img.startsWith('data:') ? 'file' : 'url', // 根据数据格式判断类型
                        name: `image_${index + 1}.png`, // 给图片一个名称
                        mime: img.startsWith('data:image/') ? img.split(';')[0].split(':')[1] : 'image/png' // 从 data URL 中提取 MIME 类型
                    };
                    console.log(`Upload ${index + 1}:`, {
                        type: upload.type,
                        name: upload.name,
                        mime: upload.mime,
                        dataLength: upload.data.length,
                        dataPrefix: upload.data.substring(0, 50) + '...'
                    });
                    return upload;
                })
            })
        };
        
        console.log('Sending request to Flowise:', {
            question: requestData.question,
            uploadsCount: requestData.uploads?.length || 0
        });
        
        const completion = await queryFlowise(requestData);

        console.log('Flowise response type:', typeof completion);
        console.log('Flowise response keys:', completion ? Object.keys(completion) : 'null');
        console.log('Flowise full response:', JSON.stringify(completion, null, 2));
        
        // Flowise 响应格式适配为标准的聊天消息格式
        // Flowise API 通常返回包含响应的对象
        let responseContent = '';
        
        if (typeof completion === 'string') {
            responseContent = completion;
        } else if (completion && typeof completion === 'object') {
            // 尝试常见的响应字段
            responseContent = completion.text || 
                             completion.response || 
                             completion.answer || 
                             completion.data || 
                             completion.result ||
                             completion.message ||
                             (typeof completion.content === 'string' ? completion.content : '') ||
                             JSON.stringify(completion);
        } else {
            responseContent = "Sorry, I couldn't generate a response.";
        }
        
        const message = {
            role: "assistant",
            content: responseContent,
            timestamp: Date.now()
        };
        
        data.messages.push(message);
        await data.save();

        return NextResponse.json({success: true, data: message})
    } catch (error) {
        console.error('Error in AI chat API:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'An error occurred while processing your request',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}