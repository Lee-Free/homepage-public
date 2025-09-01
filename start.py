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
        return super().do_GET()

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
