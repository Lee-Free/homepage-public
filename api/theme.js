// Cloudflare Workers 或 Node.js 全局主题颜色存储API
// 用于实现跨客户端的主题颜色持久化

let globalThemeColor = null; // 内存存储（生产环境建议使用数据库）

export default async function handler(request) {
    const url = new URL(request.url);
    const method = request.method;
    
    // 设置 CORS 头
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    // 处理 OPTIONS 预检请求
    if (method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
        if (method === 'GET') {
            // 获取全局主题颜色
            return new Response(JSON.stringify({
                success: true,
                data: globalThemeColor,
                message: globalThemeColor ? '获取全局主题色成功' : '暂无全局主题色设置'
            }), { 
                status: 200, 
                headers: corsHeaders 
            });
            
        } else if (method === 'POST') {
            // 设置全局主题颜色
            const body = await request.json();
            const { r, g, b, angle, saturation, lightness } = body;
            
            // 验证颜色数据格式
            if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number' ||
                r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'RGB颜色值格式错误'
                }), { 
                    status: 400, 
                    headers: corsHeaders 
                });
            }
            
            // 保存全局主题颜色
            globalThemeColor = {
                r, g, b,
                angle: angle || 0,
                saturation: saturation || 100,
                lightness: lightness || 50,
                timestamp: Date.now(),
                userAgent: request.headers.get('User-Agent') || 'unknown'
            };
            
            console.log('全局主题色已更新:', globalThemeColor);
            
            return new Response(JSON.stringify({
                success: true,
                data: globalThemeColor,
                message: '全局主题色设置成功'
            }), { 
                status: 200, 
                headers: corsHeaders 
            });
            
        } else if (method === 'DELETE') {
            // 重置全局主题颜色
            globalThemeColor = null;
            
            return new Response(JSON.stringify({
                success: true,
                message: '全局主题色已重置为默认'
            }), { 
                status: 200, 
                headers: corsHeaders 
            });
            
        } else {
            return new Response(JSON.stringify({
                success: false,
                message: '不支持的请求方法'
            }), { 
                status: 405, 
                headers: corsHeaders 
            });
        }
        
    } catch (error) {
        console.error('API处理错误:', error);
        return new Response(JSON.stringify({
            success: false,
            message: '服务器内部错误',
            error: error.message
        }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
}

// 如果在 Cloudflare Workers 环境
if (typeof addEventListener !== 'undefined') {
    addEventListener('fetch', event => {
        event.respondWith(handler(event.request));
    });
}