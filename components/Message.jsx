import { assets } from '@/assets/assets'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import Prism from 'prismjs'
import toast from 'react-hot-toast'

const Message = ({role, content, images}) => {

    const [previewModal, setPreviewModal] = useState({ isOpen: false, image: null });
    const [codePreview, setCodePreview] = useState({ isOpen: false, html: '', title: '' });

    useEffect(()=>{
        Prism.highlightAll()
    }, [content])

    const copyMessage = ()=>{
        navigator.clipboard.writeText(content)
        toast.success('Message copied to clipboard')
    }

    // 打开图片预览模态框
    const openPreviewModal = (image) => {
        setPreviewModal({ isOpen: true, image });
    };

    // 关闭图片预览模态框
    const closePreviewModal = () => {
        setPreviewModal({ isOpen: false, image: null });
    };

    // 提取HTML代码并预览
    const extractAndPreviewHTML = (markdownContent) => {
        // 匹配HTML代码块的正则表达式
        const htmlCodeRegex = /```html\s*\n([\s\S]*?)\n```/gi;
        const match = htmlCodeRegex.exec(markdownContent);
        
        if (match && match[1]) {
            const htmlCode = match[1].trim();
            setCodePreview({ 
                isOpen: true, 
                html: htmlCode, 
                title: 'HTML Preview' 
            });
        }
    };

    // 关闭代码预览
    const closeCodePreview = () => {
        setCodePreview({ isOpen: false, html: '', title: '' });
    };

    // 检查内容是否包含HTML代码
    const hasHTMLCode = (content) => {
        return /```html[\s\S]*?```/i.test(content);
    };

  return (
    <div className='flex flex-col items-center w-full max-w-3xl text-sm'>
      {/* 图片预览模态框 */}
      {previewModal.isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closePreviewModal}
        >
          <div 
            className="relative max-w-4xl max-h-4xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePreviewModal}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors z-10"
            >
              ×
            </button>
            <img 
              src={previewModal.image.url} 
              alt={previewModal.image.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
              {previewModal.image.name || 'Image'}
            </div>
          </div>
        </div>
      )}

      {/* HTML代码预览模态框 */}
      {codePreview.isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeCodePreview}
        >
          <div 
            className="relative w-5/6 h-5/6 bg-white rounded-lg shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{codePreview.title}</h3>
              <button
                onClick={closeCodePreview}
                className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            </div>
            
            {/* 预览区域 */}
            <div className="flex-1 p-4 overflow-auto">
              <iframe
                srcDoc={codePreview.html}
                className="w-full h-full border border-gray-300 rounded"
                title="HTML预览"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            
            {/* 底部工具栏 */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">HTML Preview</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(codePreview.html);
                    toast.success('HTML code copied to clipboard');
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`flex flex-col  w-full mb-8 ${role === 'user' && 'items-end'}`}>
        <div className={`group relative flex max-w-2xl py-3 rounded-xl ${role === 'user' ? 'bg-[#414158] px-5' : 'gap-3'}`}>
            <div className={`opacity-0 group-hover:opacity-100 absolute ${role === 'user' ? '-left-16 top-2.5' : 'left-9 -bottom-6'} transition-all`}>
                <div className='flex items-center gap-2 opacity-70'>
                    {
                        role === 'user' ? (
                            <>
                            <Image onClick={copyMessage} src={assets.copy_icon} alt='' className='w-4 cursor-pointer'/>
                            <Image src={assets.pencil_icon} alt='' className='w-4.5 cursor-pointer'/>
                            </>
                        ):(
                            <>
                            <Image onClick={copyMessage} src={assets.copy_icon} alt='' className='w-4.5 cursor-pointer'/>
                            <Image src={assets.regenerate_icon} alt='' className='w-4 cursor-pointer'/>
                            <Image src={assets.like_icon} alt='' className='w-4 cursor-pointer'/>
                            <Image src={assets.dislike_icon} alt='' className='w-4 cursor-pointer'/>
                            {/* HTML预览按钮 */}
                            {hasHTMLCode(content) && (
                                <button
                                    onClick={() => extractAndPreviewHTML(content)}
                                    className="w-4 h-4 cursor-pointer hover:opacity-70 transition-opacity"
                                    title="Preview HTML"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM9.5 6L14 10.5 9.5 15V6z"/>
                                    </svg>
                                </button>
                            )}
                            </>
                        )
                    }
                </div>
            </div>
            {
                role === 'user' ? 
                (
                    <div className='text-white/90'>
                        {/* 显示图片 */}
                        {images && images.length > 0 && (
                            <div className='mb-3 flex flex-wrap gap-2'>
                                {images.map((image, index) => (
                                    <div key={index} className='relative group'>
                                        <img 
                                            src={image.url} 
                                            alt={image.name || `Image ${index + 1}`}
                                            className='max-w-48 max-h-48 object-cover rounded-lg border border-gray-600 cursor-pointer hover:opacity-90 transition-opacity'
                                            onClick={() => openPreviewModal(image)}
                                        />
                                        <div className='absolute bottom-1 left-1 bg-black/70 text-xs px-1 py-0.5 rounded text-white/70 opacity-0 group-hover:opacity-100 transition-opacity'>
                                            {image.name || `Image ${index + 1}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* 显示文本内容 */}
                        <span>{content}</span>
                    </div>
                )
                :
                (
                    <>
                    <Image src={assets.logo_icon} alt='' className='h-9 w-9 p-1 border border-white/15 rounded-full'/>
                    <div className='space-y-4 w-full'>
                        <Markdown>{content}</Markdown>
                        </div>
                    </>
                )
            }
        </div>
      </div>
    </div>
  )
}

export default Message
