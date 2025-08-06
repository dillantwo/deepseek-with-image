/** @type {import('next').NextConfig} */
const nextConfig = {
  // 设置应用的基础路径为 /agent
  basePath: '/agent',
  
  // 增加服務器響應時間限制
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: 'secret',
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
};

export default nextConfig;
