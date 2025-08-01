// 錯誤處理中間件 - 用於捕獲和記錄文件上傳相關錯誤

export function createUploadErrorHandler() {
    return (error, req, res, next) => {
        console.error('Upload error:', {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            contentLength: req.headers['content-length'],
            contentType: req.headers['content-type'],
            timestamp: new Date().toISOString()
        });

        // 處理不同類型的錯誤
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: 'File size too large',
                error: 'FILE_SIZE_LIMIT_EXCEEDED'
            });
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(413).json({
                success: false,
                message: 'Too many files',
                error: 'FILE_COUNT_LIMIT_EXCEEDED'
            });
        }

        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field',
                error: 'UNEXPECTED_FILE_FIELD'
            });
        }

        if (error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Upload timeout',
                error: 'UPLOAD_TIMEOUT'
            });
        }

        if (error.message.includes('ECONNRESET') || error.message.includes('ECONNABORTED')) {
            return res.status(502).json({
                success: false,
                message: 'Connection interrupted',
                error: 'CONNECTION_INTERRUPTED'
            });
        }

        // 通用錯誤處理
        return res.status(500).json({
            success: false,
            message: 'Internal server error during file upload',
            error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
        });
    };
}

export function logUploadProgress(req, res, next) {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > 0) {
        console.log(`Upload started: ${contentLength} bytes`);
        
        req.on('data', (chunk) => {
            // 可以在這裡記錄上傳進度
        });
        
        req.on('end', () => {
            console.log('Upload completed');
        });
        
        req.on('error', (error) => {
            console.error('Upload stream error:', error);
        });
    }
    
    next();
}
