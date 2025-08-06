import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // 排除 _next、agent、assets 和所有静态文件
    '/((?!_next|agent|assets|.*\\.[a-zA-Z0-9]+$).*)',
    // 处理 API 路由
    '/api/(.*)',
    '/trpc/(.*)',
  ],
};