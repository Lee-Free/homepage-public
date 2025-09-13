// Cloudflare Pages Function (可选)
// 可选绑定 KV（命名空间名称 CHECKIN_KV），若未绑定则返回 501，前端回退到本地存储
// 路由：
// GET  /api/checkin?uid=<id>           -> 返回 { days: [] }
// POST /api/checkin?uid=<id>  body:{ day: "YYYY-MM-DD" }  -> 写入签到

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const uid = url.searchParams.get('uid');
  const method = request.method;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (method === 'OPTIONS') return new Response(null, { headers: cors });

  if (!uid) return json({ error: 'missing uid' }, 400, cors);

  const kv = env.CHECKIN_KV;
  if (!kv) {
    console.log('CHECKIN_KV not bound to environment');
    return json({ 
      error: 'kv_not_configured', 
      message: 'KV存储未配置，请在Cloudflare Pages中绑定CHECKIN_KV命名空间' 
    }, 501, cors);
  }

  const key = `checkin:${uid}`;

  try {
    if (method === 'GET') {
      const raw = await kv.get(key);
      const data = parse(raw);
      console.log(`KV GET success for uid: ${uid}, days count: ${data.days.length}`);
      return json(data, 200, cors);
    }

    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const day = body.day;
      if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        return json({ error: 'bad day', message: '日期格式错误，应为YYYY-MM-DD' }, 400, cors);
      }
      
      const raw = await kv.get(key);
      const data = parse(raw);
      const set = new Set(data.days || []);
      const oldSize = set.size;
      set.add(day);
      const merged = Array.from(set).sort();
      
      await kv.put(key, JSON.stringify({ days: merged }));
      
      const isNewDay = set.size > oldSize;
      console.log(`KV POST success for uid: ${uid}, day: ${day}, new: ${isNewDay}, total days: ${merged.length}`);
      
      return json({ 
        ok: true, 
        days: merged, 
        newDay: isNewDay,
        message: isNewDay ? '新访问记录已保存' : '今日已记录'
      }, 200, cors);
    }
  } catch (kvError) {
    console.error('KV operation failed:', kvError);
    return json({ 
      error: 'kv_operation_failed', 
      message: 'KV存储操作失败: ' + kvError.message,
      details: kvError.toString()
    }, 500, cors);
  }

  return json({ error: 'method_not_allowed' }, 405, cors);
}

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function parse(raw) {
  try {
    const data = raw ? JSON.parse(raw) : { days: [] };
    if (!Array.isArray(data.days)) return { days: [] };
    return { days: data.days };
  } catch {
    return { days: [] };
  }
}

