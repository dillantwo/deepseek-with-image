import { NextResponse } from "next/server";

// Flowise API configuration
const FLOWISE_BASE_URL = process.env.FLOWISE_BASE_URL;
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

export async function GET() {
    try {
        // Get all chatflows
        const response = await fetch(`${FLOWISE_BASE_URL}/api/v1/chatflows`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${FLOWISE_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Flowise API error: ${response.status} ${response.statusText}`);
        }

        const chatflows = await response.json();
        
        // Format chatflows data, return only needed fields
        // All fetched chatflows are available, so set deployed to true
        const formattedChatflows = chatflows.map(flow => ({
            id: flow.id,
            name: flow.name,
            description: flow.description || '',
            deployed: true, // All fetched ones are available
            category: flow.category || 'General'
        }));

        return NextResponse.json({
            success: true,
            data: formattedChatflows
        });

    } catch (error) {
        console.error('Error fetching chatflows:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Failed to fetch chatflows',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
