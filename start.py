#!/usr/bin/env python3
"""
本地开发服务器（带 GitHub GraphQL 代理）
- 静态资源：使用 SimpleHTTPRequestHandler 提供
- API 代理：GET /api/github/contributions?login=xxx&from=ISO&to=ISO
  使用服务端环境变量 GITHUB_TOKEN 调用 https://api.github.com/graphql
"""

import http.server
import socketserver
import webbrowser
import os
import json
import urllib.parse
import urllib.request

# 读取 .env（简单解析，key=value，每行一项）
ENV_PATH = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(ENV_PATH):
    try:
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    os.environ.setdefault(k, v)
    except Exception as _:
        pass

PORT = int(os.environ.get('PORT') or 8002)  # 默认端口
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')

QUERY = """
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        colors
        weeks { contributionDays { date contributionCount color weekday } }
      }
    }
  }
  rateLimit { remaining resetAt cost }
}
"""

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/github/contributions":
            return self.handle_contributions(parsed)
        elif parsed.path == "/api/checkin":
            return self.handle_checkin_get(parsed)
        elif parsed.path == "/api/theme":
            return self.handle_theme_get(parsed)
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/checkin":
            return self.handle_checkin_post(parsed)
        elif parsed.path == "/api/theme":
            return self.handle_theme_post(parsed)
        return self.send_json({"error": "endpoint not found"}, 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/theme":
            return self.handle_theme_delete(parsed)
        return self.send_json({"error": "endpoint not found"}, 404)

    def handle_contributions(self, parsed):
        try:
            qs = urllib.parse.parse_qs(parsed.query)
            login = (qs.get('login') or [None])[0]
            from_ = (qs.get('from') or [None])[0]
            to = (qs.get('to') or [None])[0]
            if not (login and from_ and to):
                return self.send_json({"error": "missing params"}, 400)
            if not GITHUB_TOKEN:
                return self.send_json({"error": "missing GITHUB_TOKEN env"}, 500)

            body = json.dumps({
                'query': QUERY,
                'variables': { 'login': login, 'from': from_, 'to': to }
            }).encode('utf-8')

            req = urllib.request.Request(
                'https://api.github.com/graphql',
                data=body,
                headers={
                    'Authorization': f'Bearer {GITHUB_TOKEN}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'contrib-proxy'
                }
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode('utf-8'))

            if 'errors' in data:
                return self.send_json({"error": data['errors']}, 502)

            calendar = data['data']['user']['contributionsCollection']['contributionCalendar']
            normalized = self.normalize_calendar(calendar)
            return self.send_json(normalized, 200)
        except Exception as e:
            return self.send_json({"error": "proxy_error", "detail": str(e)}, 500)

    def normalize_calendar(self, calendar):
        days = []
        for w in calendar.get('weeks', []):
            for d in w.get('contributionDays', []):
                days.append({
                    'date': d.get('date'),
                    'count': d.get('contributionsCount', d.get('contributionCount')),
                    'color': d.get('color'),
                    'weekday': d.get('weekday')
                })
        return {
            'days': days,
            'total': calendar.get('totalContributions', 0),
            'colors': calendar.get('colors', [])
        }

    # 简单的文件存储（用于演示，生产环境应使用数据库）
    _storage_file = os.path.join(os.path.dirname(__file__), 'data.json')

    def load_storage(self):
        """加载存储数据"""
        try:
            if os.path.exists(self._storage_file):
                with open(self._storage_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"加载存储数据失败: {e}")
        return {"checkin": {}, "theme": None}

    def save_storage(self, data):
        """保存存储数据"""
        try:
            with open(self._storage_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存存储数据失败: {e}")
            return False

    def handle_checkin_get(self, parsed):
        # 签到 API - 获取用户签到数据
        try:
            qs = urllib.parse.parse_qs(parsed.query)
            uid = (qs.get('uid') or [None])[0]
            if not uid:
                return self.send_json({"error": "missing uid parameter"}, 400)

            data = self.load_storage()
            user_data = data["checkin"].get(uid, {"days": []})
            return self.send_json({"success": True, "data": user_data}, 200)
        except Exception as e:
            return self.send_json({"error": "server error", "detail": str(e)}, 500)

    def handle_checkin_post(self, parsed):
        # 签到 API - 保存用户签到数据
        try:
            qs = urllib.parse.parse_qs(parsed.query)
            uid = (qs.get('uid') or [None])[0]
            if not uid:
                return self.send_json({"error": "missing uid parameter"}, 400)

            # 读取请求体
            content_length = int(self.headers.get('content-length', 0))
            if content_length > 0:
                post_data = self.rfile.read(content_length)
                body = json.loads(post_data.decode('utf-8'))
                day = body.get('day')
                if not day:
                    return self.send_json({"error": "missing day parameter"}, 400)
            else:
                return self.send_json({"error": "missing request body"}, 400)

            # 更新数据
            data = self.load_storage()
            if uid not in data["checkin"]:
                data["checkin"][uid] = {"days": []}

            if day not in data["checkin"][uid]["days"]:
                data["checkin"][uid]["days"].append(day)

            if self.save_storage(data):
                return self.send_json({"success": True, "message": "checkin saved"}, 200)
            else:
                return self.send_json({"error": "failed to save data"}, 500)

        except Exception as e:
            return self.send_json({"error": "server error", "detail": str(e)}, 500)

    def handle_theme_get(self, parsed):
        # 主题 API - 获取全局主题色
        try:
            data = self.load_storage()
            theme_data = data.get("theme")
            if theme_data:
                return self.send_json({"success": True, "data": theme_data}, 200)
            else:
                return self.send_json({"success": False, "message": "no theme data"}, 200)
        except Exception as e:
            return self.send_json({"error": "server error", "detail": str(e)}, 500)

    def handle_theme_post(self, parsed):
        # 主题 API - 保存全局主题色
        try:
            # 读取请求体
            content_length = int(self.headers.get('content-length', 0))
            if content_length > 0:
                post_data = self.rfile.read(content_length)
                theme_color = json.loads(post_data.decode('utf-8'))
            else:
                return self.send_json({"error": "missing request body"}, 400)

            # 更新数据
            data = self.load_storage()
            data["theme"] = theme_color

            if self.save_storage(data):
                return self.send_json({"success": True, "message": "theme saved"}, 200)
            else:
                return self.send_json({"error": "failed to save data"}, 500)

        except Exception as e:
            return self.send_json({"error": "server error", "detail": str(e)}, 500)

    def handle_theme_delete(self, parsed):
        # 主题 API - 删除全局主题色
        try:
            data = self.load_storage()
            data["theme"] = None

            if self.save_storage(data):
                return self.send_json({"success": True, "message": "theme deleted"}, 200)
            else:
                return self.send_json({"error": "failed to save data"}, 500)

        except Exception as e:
            return self.send_json({"error": "server error", "detail": str(e)}, 500)

    def send_json(self, obj, status=200):
        payload = json.dumps(obj).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'public, max-age=3600')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

print(f"🚀 启动本地服务器，端口: {PORT}")
print(f"📍 访问地址: http://localhost:{PORT}")
print("按 Ctrl+C 停止服务器")
if not GITHUB_TOKEN:
    print("⚠️ 未检测到环境变量 GITHUB_TOKEN，将无法提供精确的贡献日历代理（仍可访问静态页）")

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        # 自动打开浏览器
        webbrowser.open(f"http://localhost:{PORT}")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n服务器已停止")
except Exception as e:
    print(f"错误: {e}")
