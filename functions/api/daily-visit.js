// Cloudflare Pages Function for daily visit tracking
// 可选绑定 KV（命名空间名称 CHECKIN_KV），若未绑定则返回 501，前端回退到本地存储
// 路由：POST /api/daily-visit  body:{ date: "YYYY-MM-DD", timestamp: number }
// 返回：{ todayCount: number, totalCount: number, isNewVisit: boolean, message: string }

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (method === 'OPTIONS') return new Response(null, { headers: cors });

  // 只读查询：GET /api/daily-visit?date=YYYY-MM-DD
  if (method === 'GET') {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: 'bad_date', message: '日期格式错误，应为YYYY-MM-DD' }, 400, cors);
    }

    const kv = env.CHECKIN_KV;
    if (!kv) {
      return json({ 
        error: 'kv_not_configured', 
        message: 'KV存储未配置，请在Cloudflare Pages中绑定CHECKIN_KV命名空间' 
      }, 501, cors);
    }

    try {
      const todayKey = `daily-visit:${date}`;
      const totalKey = 'daily-visit:total';
      const todayRaw = await kv.get(todayKey);
      const totalRaw = await kv.get(totalKey);
      const todayCount = todayRaw ? parseInt(todayRaw) : 0;
      const totalCount = totalRaw ? parseInt(totalRaw) : 0;
      return json({ todayCount, totalCount, date }, 200, cors);
    } catch (e) {
      return json({ error: 'kv_read_failed', message: String(e) }, 500, cors);
    }
  }

  if (method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, cors);
  }

  // 统一与其它功能（主题、checkin）共用同一 KV 绑定：CHECKIN_KV
  const kv = env.CHECKIN_KV;
  if (!kv) {
    console.log('CHECKIN_KV not bound to environment');
    return json({ 
      error: 'kv_not_configured', 
      message: 'KV存储未配置，请在Cloudflare Pages中绑定CHECKIN_KV命名空间' 
    }, 501, cors);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const date = body.date;
    const timestamp = body.timestamp;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: 'bad_date', message: '日期格式错误，应为YYYY-MM-DD' }, 400, cors);
    }

    // 获取客户端IP地址（用于去重）
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For') || 
                     request.headers.get('X-Real-IP') || 
                     'unknown';

    // 今日访问记录的key
    const todayKey = `daily-visit:${date}`;
    // 总访问记录的key
    const totalKey = 'daily-visit:total';
    // IP访问记录的key（用于去重）
    const ipKey = `daily-visit:ip:${date}:${clientIP}`;

    // 检查该IP今天是否已经访问过
    const existingIP = await kv.get(ipKey);
    const isNewVisit = !existingIP;

    let todayCount = 0;
    let totalCount = 0;

    if (isNewVisit) {
      // 新访问：更新今日计数
      const todayRaw = await kv.get(todayKey);
      todayCount = todayRaw ? parseInt(todayRaw) + 1 : 1;
      await kv.put(todayKey, todayCount.toString());

      // 更新总计数
      const totalRaw = await kv.get(totalKey);
      totalCount = totalRaw ? parseInt(totalRaw) + 1 : 1;
      await kv.put(totalKey, totalCount.toString());

      // 记录IP访问（24小时过期）
      await kv.put(ipKey, timestamp.toString(), { expirationTtl: 86400 });

      console.log(`New visit from IP: ${clientIP}, date: ${date}, todayCount: ${todayCount}, totalCount: ${totalCount}`);
    } else {
      // 已访问过：只返回当前计数
      const todayRaw = await kv.get(todayKey);
      const totalRaw = await kv.get(totalKey);
      todayCount = todayRaw ? parseInt(todayRaw) : 0;
      totalCount = totalRaw ? parseInt(totalRaw) : 0;

      console.log(`Existing visit from IP: ${clientIP}, date: ${date}, todayCount: ${todayCount}, totalCount: ${totalCount}`);
    }

    return json({
      todayCount,
      totalCount,
      isNewVisit,
      message: isNewVisit ? '新访问记录已保存' : '今日已记录此IP访问'
    }, 200, cors);

  } catch (kvError) {
    console.error('KV operation failed:', kvError);
    return json({ 
      error: 'kv_operation_failed', 
      message: 'KV存储操作失败: ' + kvError.message,
      details: kvError.toString()
    }, 500, cors);
  }
}

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
