// Cloudflare Pages Functions - 主题颜色API
// 用于实现跨客户端的主题颜色持久化

export async function onRequestGet(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    try {
        // 从KV存储中获取全局主题颜色
        const themeColor = await context.env.CHECKIN_KV?.get('global_theme_color');
        
        if (themeColor) {
            const data = JSON.parse(themeColor);
            return new Response(JSON.stringify({
                success: true,
                data: data,
                message: '获取全局主题色成功'
            }), { 
                status: 200, 
                headers: corsHeaders 
            });
        } else {
            return new Response(JSON.stringify({
                success: true,
                data: null,
                message: '暂无全局主题色设置'
            }), { 
                status: 200, 
                headers: corsHeaders 
            });
        }
    } catch (error) {
        console.error('获取主题色失败:', error);
        
        // 如果KV不可用，返回特殊状态码
        if (error.message?.includes('CHECKIN_KV')) {
            return new Response(JSON.stringify({
                success: false,
                message: 'KV存储未配置，仅支持本地存储'
            }), { 
                status: 501, // 服务未实现
                headers: corsHeaders 
            });
        }
        
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

export async function onRequestPost(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    try {
        const body = await context.request.json();
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
        
        // 构建主题色数据
        const themeColorData = {
            r, g, b,
            angle: angle || 0,
            saturation: saturation || 100,
            lightness: lightness || 50,
            timestamp: Date.now(),
            userAgent: context.request.headers.get('User-Agent') || 'unknown'
        };
        
        // 保存到KV存储
        await context.env.CHECKIN_KV?.put('global_theme_color', JSON.stringify(themeColorData));
        
        console.log('全局主题色已更新:', themeColorData);
        
        return new Response(JSON.stringify({
            success: true,
            data: themeColorData,
            message: '全局主题色设置成功'
        }), { 
            status: 200, 
            headers: corsHeaders 
        });
        
    } catch (error) {
        console.error('保存主题色失败:', error);
        
        // 如果KV不可用，返回特殊状态码
        if (error.message?.includes('CHECKIN_KV')) {
            return new Response(JSON.stringify({
                success: false,
                message: 'KV存储未配置，仅支持本地存储'
            }), { 
                status: 501, // 服务未实现
                headers: corsHeaders 
            });
        }
        
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

export async function onRequestDelete(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    try {
        // 从KV存储中删除全局主题颜色
        await context.env.CHECKIN_KV?.delete('global_theme_color');
        
        return new Response(JSON.stringify({
            success: true,
            message: '全局主题色已重置为默认'
        }), { 
            status: 200, 
            headers: corsHeaders 
        });
        
    } catch (error) {
        console.error('重置主题色失败:', error);
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

export async function onRequestOptions(context) {
    // 处理 CORS 预检请求
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    return new Response(null, { status: 200, headers: corsHeaders });
}