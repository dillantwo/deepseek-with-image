export const maxDuration = 300;

import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(req) {
    try {
        const { userId } = getAuth(req);
        
        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "User not authenticated",
            });
        }

        // 獲取請求體大小
        const contentLength = req.headers.get('content-length');
        console.log('File upload request size:', contentLength, 'bytes');
        
        // 檢查是否超過限制（50MB = 52428800 bytes）
        if (contentLength && parseInt(contentLength) > 52428800) {
            return NextResponse.json({
                success: false,
                message: "File size exceeds 50MB limit",
            });
        }

        const formData = await req.formData();
        const files = formData.getAll('files');
        
        if (!files || files.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No files provided",
            });
        }

        const processedFiles = [];
        
        for (const file of files) {
            if (file.size > 52428800) { // 50MB
                return NextResponse.json({
                    success: false,
                    message: `File ${file.name} exceeds 50MB limit`,
                });
            }
            
            // 轉換為 base64
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${file.type};base64,${base64}`;
            
            processedFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                url: dataUrl
            });
        }

        return NextResponse.json({
            success: true,
            data: processedFiles
        });
        
    } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to process file upload'
        });
    }
}
