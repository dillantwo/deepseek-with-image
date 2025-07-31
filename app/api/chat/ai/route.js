export const maxDuration = 60;
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
// import { AzureOpenAI } from "openai";

// Flowise API configuration
const FLOWISE_BASE_URL = process.env.FLOWISE_BASE_URL;
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

// Function to create session ID based on user_id and chat_id
// This ensures the same chat conversation always uses the same session ID
function createSessionId(userId, chatId) {
    // Create a namespace UUID (version 5)
    const namespace = "b6Vzr2ZBar8Ssb34euKp9VCm_n23DzBJMm0Baa7bphU";
    
    // Combine user_id and chat_id (no timestamp to ensure consistency)
    const seed = `${userId}:${chatId}`;
    
    // Generate a UUID based on the namespace and seed using crypto.createHash
    const crypto = require('crypto');
    const hash = crypto.createHash('sha1').update(namespace + seed).digest('hex');
    
    // Format as UUID v5
    const uuid = [
        hash.substr(0, 8),
        hash.substr(8, 4),
        '5' + hash.substr(13, 3), // Version 5
        ((parseInt(hash.substr(16, 1), 16) & 0x3) | 0x8).toString(16) + hash.substr(17, 3), // Variant
        hash.substr(20, 12)
    ].join('-');
    
    return uuid;
}

// Helper function to query Flowise API
async function queryFlowise(data, chatflowId) {
    const FLOWISE_API_URL = `${FLOWISE_BASE_URL}/api/v1/prediction/${chatflowId}`;
    
    const response = await fetch(FLOWISE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(FLOWISE_API_KEY && { "Authorization": `Bearer ${FLOWISE_API_KEY}` })
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        // Get detailed error information
        let errorMessage = `Flowise API error: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.text();
            if (errorBody) {
                errorMessage += ` - ${errorBody}`;
            }
        } catch (e) {
            // Ignore errors when parsing error response body
        }
        throw new Error(errorMessage);
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

        // Extract chatId, prompt, images, and chatflowId from the request body
        const { chatId, prompt, images, chatflowId } = await req.json();

        console.log('Received request:', { userId, chatId, prompt, imagesCount: images?.length, chatflowId });
        
        // If there are images, print image information for debugging
        if (images && images.length > 0) {
            console.log('Received images:', images.map((img, index) => ({
                index,
                isBase64: typeof img === 'string' && img.startsWith('data:'),
                isUrl: typeof img === 'string' && (img.startsWith('http') || img.startsWith('blob:')),
                type: typeof img,
                preview: typeof img === 'string' ? img.substring(0, 50) + '...' : 'object'
            })));
        }

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

        if(!chatflowId){
            return NextResponse.json({
                success: false,
                message: "Chatflow selection is required",
              });
        }

        // Generate session ID for this chat conversation
        // Same chat will always have the same session ID for context continuity
        const sessionId = createSessionId(userId, chatId);
        console.log('Generated session ID for chat:', sessionId);

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
            // Handle image information: if images is a string array (URLs), convert to object format
            ...(images && images.length > 0 && { 
                images: images.map((img, index) => {
                    if (typeof img === 'string') {
                        // If it's a string (URL), convert to object format
                        return {
                            name: `Image ${index + 1}`,
                            url: img
                        };
                    } else if (typeof img === 'object' && img.url) {
                        // If it's already in object format, use it directly
                        return img;
                    } else {
                        // Fallback handling
                        return {
                            name: `Image ${index + 1}`,
                            url: img
                        };
                    }
                })
            })
        };

        data.messages.push(userPrompt);

        // If this is the first user message (chat just created), set the question as chat name
        const isFirstMessage = data.messages.filter(msg => msg.role === 'user').length === 1;
        if (isFirstMessage && data.name === "New Chat") {
            // Truncate to first 50 characters as chat name to avoid overly long names
            const chatName = prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt;
            data.name = chatName;
        }

        // Prepare chat history for Flowise API
        // Flowise may need historical messages to maintain conversation context
        const chatHistory = data.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            ...(msg.images && { images: msg.images })
        }));

        // Call the Flowise API to get a chat completion
        // Use the session ID generated earlier
        
        // First test the simplest request format
        const requestData = {
            question: prompt,
            overrideConfig: {
                sessionId: sessionId
            }
        };
        
        // Only add uploads field when there are images
        if (images && images.length > 0) {
            requestData.uploads = images.map((img, index) => {
                const upload = {
                    data: img, // Should be base64 string or URL
                    type: img.startsWith('data:') ? 'file' : 'url', // Determine type based on data format
                    name: `image_${index + 1}.png`, // Give the image a name
                    mime: img.startsWith('data:image/') ? img.split(';')[0].split(':')[1] : 'image/png' // Extract MIME type from data URL
                };
                console.log(`Upload ${index + 1}:`, {
                    type: upload.type,
                    name: upload.name,
                    mime: upload.mime,
                    dataLength: upload.data.length,
                    dataPrefix: upload.data.substring(0, 50) + '...'
                });
                return upload;
            });
        }
        
        console.log('Sending request to Flowise:', {
            question: requestData.question,
            sessionId: requestData.overrideConfig.sessionId,
            uploadsCount: requestData.uploads?.length || 0,
            fullRequest: JSON.stringify(requestData),
            chatflowId: chatflowId
        });
        
        const completion = await queryFlowise(requestData, chatflowId);

        console.log('Flowise response type:', typeof completion);
        console.log('Flowise response keys:', completion ? Object.keys(completion) : 'null');
        console.log('Flowise full response:', JSON.stringify(completion, null, 2));
        
        // Adapt Flowise response format to standard chat message format
        // Flowise API usually returns an object containing the response
        let responseContent = '';
        
        if (typeof completion === 'string') {
            responseContent = completion;
        } else if (completion && typeof completion === 'object') {
            // Try common response fields
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

        // Return assistant message and updated chat information (including possibly updated name)
        return NextResponse.json({
            success: true, 
            data: message,
            chatName: data.name // Return updated chat name
        })
    } catch (error) {
        console.error('Error in AI chat API:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'An error occurred while processing your request',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}