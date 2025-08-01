/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 增加 API 路由的請求體大小限制
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  // 增加服務器響應時間限制
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: 'secret',
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
  // 配置 API 路由
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
    externalResolver: true,
  },
};

export default nextConfig;
