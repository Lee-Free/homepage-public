# 🏠 个人主页项目

## 🌐 在线演示
**我的站点：** [https://edxx.de](https://edxx.de)
**原作者演示：** [http://home.loadke.tech/](http://home.loadke.tech/)

## 👨‍💻 项目信息
**原作者：** [阿布白（IonRh）](https://github.com/IonRh)
**原项目地址：** [https://github.com/IonRh/homepage-public](https://github.com/IonRh/homepage-public)


> 🚀 使用原生 HTML、CSS、JS 构建，未依赖任何框架或插件，保证轻量高效。

## ✨ 项目功能

- 🎨 **简洁美观** - 提供清爽的主页展示界面
- 📱 **响应式设计** - 完美适配手机、平板、桌面等各种设备
- ⚡ **极速加载** - 优化性能，提升用户浏览体验
- 📊 **GitHub 统计** - 自动获取并显示真实的 GitHub 贡献数据
- 🌍 **访客信息** - 显示访客 IP 地址和地理位置
- ⚙️ **配置驱动** - 所有内容通过配置文件统一管理
- 🧭 **访问统计** - 展示今日/累计访问次数（默认本地存储，Cloudflare KV 可选持久化）
- 🔧 **模块化设计** - 第三个标签页支持多种类型：日记统计、项目展示、自定义内容，或完全禁用
- 🎯 **个性化** - 支持自定义标签、项目、技能展示
- 🌈 **背景调色盘** - 圆形HSL调色盘，支持实时背景颜色个性化定制（连续点击主题按钮4次开启）

## 🌈 背景调色盘功能

### 功能特性
- **🎨 圆形HSL调色盘**：360°全色域颜色选择，支持任意颜色定制
- **👆 智能触发**：连续快速点击主题按钮4次开启（暗色主题下会自动切换到亮色主题）
- **💡 进度提示**：第3次点击显示"再点击1次"，第4次显示"调色盘已开启"
- **👁️ 实时预览**：鼠标悬停预览颜色效果，点击确认选择
- **🔄 重置功能**：支持一键重置为默认蓝色主题
- **📱 响应式设计**：完美适配桌面、平板、手机等各种设备
- **🌐 跨浏览器兼容**：Chrome、Safari、Firefox等浏览器完美居中显示
- **🌙 主题优先级**：调色盘仅在亮色主题下可用，暗色主题时会自动切换到亮色主题
- **💾 本地存储**：颜色设置自动保存到浏览器本地存储
- **☁️ 全局持久化**：支持跨客户端同步（需要部署API服务和配置KV存储）

### 使用方法
1. **开启调色盘**：连续快速点击主题切换按钮4次（暗色主题下会自动切换到亮色主题后开启）
2. **选择颜色**：鼠标在色环上移动预览效果，点击确认选择
3. **重置颜色**：点击"重置默认"按钮恢复默认蓝色主题
4. **主题切换**：切换到暗色主题将显示默认暗色背景，不受调色盘影响

### 高级功能：全局持久化
如需启用跨客户端同步功能，可使用Cloudflare Pages Functions + KV存储：

```bash
# 1. 项目已包含 functions/api/theme.js 文件，部署后自动生效
# 2. 在Cloudflare Pages项目中绑定KV命名空间
# 3. 无需额外配置，调色盘将自动检测并使用 /api/theme 端点
```

**配置步骤**：
1. 在 Cloudflare Dashboard 创建 KV 命名空间（例如：`homepage-data`）
2. 在 Pages 项目设置 → Functions → KV 绑定中，将变量名设为 `CHECKIN_KV`
3. 部署后调色盘和访问统计都会自动支持跨设备同步

**状态提示**：
- 🎨 全局主题色已更新：成功保存到云端
- 📱 仅本地生效：KV存储未配置或网络连接失败
- ⚠️ 保存失败：服务异常，已降级为本地存储

## 🔧 自定义栏目功能

### 支持的栏目类型

- **日记统计** - 显示写作天数、连续记录等统计信息
- **项目展示** - 展示个人项目，支持GitHub链接和演示地址
- **学习记录** - 显示学习进度、完成课程等信息
- **阅读统计** - 展示读书数量、页数等阅读数据
- **自定义内容** - 完全自定义HTML和JavaScript
- **完全禁用** - 隐藏第三个标签页

### 快速配置

编辑 `modules/custom-section-config.js` 文件：

```javascript
const CUSTOM_SECTION_CONFIG = {
    enabled: true,           // 是否启用
    type: 'diary',          // 类型：diary | projects | custom
    title: '日记',          // 标签页标题
    icon: 'fas fa-book',    // 图标
    config: {
        // 具体配置...
    }
};
```

详细配置说明请参考 `modules/README.md`。

## 🚀 快速开始

### 本地测试

```bash
# 克隆项目
git clone https://github.com/zduu/homepage-public.git
cd homepage-public

# 启动本地服务器（含可选 GraphQL 代理，端口 8002）
# 可选：设置 GitHub Token 以启用“精确贡献日历”
# Windows PowerShell
#setx GITHUB_TOKEN "ghp_your_token"   # 永久；或使用当前会话：
$env:GITHUB_TOKEN="ghp_your_token"
python start.py

# 纯静态方式（不含代理）
python -m http.server 8000
# 或 Node.js
npx http-server -p 8000
```

- 使用 `python start.py` 时，访问 `http://localhost:8002`
- 使用内置/Node 静态服务器时，访问 `http://localhost:8000`

### 环境变量与配置示例
- `.env.example`：环境变量示例（复制为 `.env`，不会被提交到 Git）
- `.env`：本地私密环境变量（已在 `.gitignore` 中忽略）
- `config.example.js`：配置示例（复制为 `config.js` 并修改）

```bash
# 初始化示例
cp .env.example .env   # Windows 可用：copy .env.example .env
cp config.example.js config.js   # Windows：copy config.example.js config.js
```


## ⚙️ 配置说明

所有个人信息都在 `config.js` 文件中统一管理，修改后刷新页面即可看到效果。

### 🔧 核心配置

<details>
<summary><strong>📋 个人信息配置</strong></summary>

```javascript
personal: {
    name: "你的名字",                    // 显示在页面标题
    title: "你的职位",                   // 显示在头像下方
    quote: "你的个人格言",               // 个人座右铭
    location: "你的位置",                // 地理位置
    status: "你的状态",                  // 当前状态
    avatar: "./static/1.png",            // 头像图片路径
    favicon: "./static/f2.png"           // 网站图标路径
}
```
</details>

<details>
<summary><strong>🐙 GitHub 配置</strong></summary>

```javascript
github: {

> 贡献日历数据来源配置（可选）：
>
> ```js
> github: {
>   username: "你的GitHub用户名",
>   profileUrl: "https://github.com/你的用户名",
>   // 'auto'：优先使用代理获取精确数据，失败回退 events
>   // 'proxy'：仅使用代理（需要后端支持）
>   // 'events'：仅使用 events 估算（无需后端，默认 Cloudflare 静态可用）
>   calendarSource: 'auto',
>   calendarProxyEndpoint: '/api/github/contributions'
> }
> ```

    username: "你的GitHub用户名",         // ⚠️ 重要：影响统计数据获取
    profileUrl: "https://github.com/你的用户名"
}
```
</details>

<details>
<summary><strong>🔗 社交链接配置</strong></summary>

```javascript
social: {
    github: "https://github.com/你的用户名",
    email: "你的邮箱@example.com",
    telegram: "https://t.me/你的用户名"
}
```
</details>

<details>
<summary><strong>🏷️ 标签和展示配置</strong></summary>

```javascript
// 个人标签
tags: ["标签1", "标签2", "标签3"],

// 网站展示
websites: [
    {
        name: "网站名称",
        description: "网站描述",
        url: "https://your-website.com",
        icon: "图标链接"
    }
],

// 项目展示
projects: [
    {
        name: "项目名称",
        description: "项目描述",
        url: "https://github.com/username/project",
        icon: "项目图标链接"
    }
],

// 技能展示
skills: [
    {
        name: "技能名称",
        icon: "技能图标链接"
    }
]
```
</details>

<details>
<summary><strong>📝 页面文本配置</strong></summary>

```javascript
texts: {
    githubStats: {
        totalCommitsLabel: "总计贡献：",
        totalCommitsText: "过去一年共提交了",
        // ... 更多文本配置
    },
    sectionTitles: {
        welcome: "欢迎您",
        websites: "我的站点",
        // ... 更多标题配置
    }
}
```
</details>
## 📈 访问统计功能

本项目内置简易的“访问统计”模块，默认使用浏览器本地存储记录访问数据：

- 今日访问：统计当前自然日内的访问次数
- 累计访问：自首次访问以来的总访问次数
- 页面刷新即自动增加一次访问计数
- 按钮保留（占位），访问统计模式下无效

### 存储方式

- 默认：localStorage（刷新/重启浏览器仍保留；清除"站点数据"或无痕模式会清空）
- 可选：Cloudflare KV 永久存储（与调色盘共用同一个KV命名空间）

> 如需启用 KV（可选）：
>
> 1) 在 `functions/api/checkin.js` 已提供示例接口 `/api/checkin`：
> - GET /api/checkin?uid=<id> 返回 { days: [] }
> - POST /api/checkin?uid=<id> 写入某天访问记录
>
> 2) 在 Cloudflare Pages 项目 → Settings → Functions → KV Bindings:
> - 绑定命名空间为 `CHECKIN_KV`（与调色盘功能共用）
>
> 3) 前端会自动探测 KV 是否可用（501 表示未配置），若可用则在访问时尝试同步。

### 注意

- 跨浏览器/设备/域名不会共享本地访问数据
- 如需跨设备统计，请启用 KV，并在前端生成的 `checkin:uid` 基础上进行关联（项目已内置生成/持久化 uid 的方法）



### 🖼️ 图片资源

推荐使用在线图标服务，避免本地文件管理：

- **头像图片**：建议使用 [Gravatar](https://gravatar.com/) 或 [GitHub头像](https://github.com/username.png)
- **技能图标**：推荐 [DevIcons](https://devicons.github.io/devicon/) 或 [Simple Icons](https://simpleicons.org/)
- **项目图标**：推荐 [Icons8](https://icons8.com/) 或 [Iconify](https://iconify.design/)

## 🚀 部署指南

### Cloudflare Pages 部署

1. **准备工作**
   - 修改 `config.js` 中的 `github.username`
   - 如需“精确贡献日历”，你有两种选择：
     - 纯静态部署（默认，简单）：把 `github.calendarSource` 设为 `'events'` 或 `'auto'`（自动回退），无需后端
     - 使用 Pages Functions（可选）：保持 `calendarSource: 'auto'` 或 `'proxy'`，并提供 `/api/github/contributions` 函数（示例可向我索取）

2. **部署步骤**
   - Fork 本仓库到你的 GitHub
   - 登录 [Cloudflare Pages](https://pages.cloudflare.com/)
   - 连接 GitHub 仓库
   - 构建设置：
     - 构建命令：留空（本项目为纯静态）
     - 构建输出目录：`/`
   - 部署完成后绑定自定义域名

### 如何获取 GITHUB_TOKEN（只读、最低权限）
1. 打开 https://github.com/settings/tokens
2. 推荐使用 Fine-grained token（或经典 Token 也可）
3. 权限选择：只读公共仓库即可（无需私有权限）
4. 复制 Token，粘贴到 `.env` 的 `GITHUB_TOKEN=` 后
5. 切勿将 `.env` 提交到 Git（已被忽略）

### 在 Cloudflare 中使用
- 纯静态 Cloudflare Pages：无需 Token，也能展示“估算版”贡献日历（events）。
  - 建议在 `config.js`：`calendarSource: 'events'` 或保留 `'auto'`（自动回退）
- Cloudflare Pages Functions（可选，启用“精确日历”）：
  - 新建函数 `/api/github/contributions`，读取环境变量 `GITHUB_TOKEN`，实现与 README 前文一致的 GraphQL 代理
  - 在 Pages 的项目设置中新增环境变量 `GITHUB_TOKEN`
  - 前端配置保持：
    ```js
    github: {
      calendarSource: 'auto',
      calendarProxyEndpoint: '/api/github/contributions'
    }
    ```
  - 部署后，前端将优先调用该端点获取精确数据，失败时回退到 events

## 启用 Cloudflare Pages Functions（精确贡献日历）

本仓库已内置函数：`functions/api/github/contributions.js`

1) 在 Cloudflare Pages 项目 → Settings → Environment variables，新建：
   - `GITHUB_TOKEN` = 你的 Token（只读、最低权限；若需私有贡献计入，请使用你本人账号 Token，并在 GitHub 个人设置中勾选“Include private contributions”）

2) 部署后，前端无需改动或仅保持：
```js
// config.js 中（默认已是 auto）
github: {
  calendarSource: 'auto',
  calendarProxyEndpoint: '/api/github/contributions'
}
```

3) 验证
- 打开你的站点，切换到“日历”视图，应显示完整 1 年绿色格子；若函数异常，前端会自动回退到 events 估算

4) 常见问题
- 403/401：检查 GITHUB_TOKEN 是否正确、未过期
- 数据缺天：GraphQL 正常，但你账号近年无活动；或私有贡献未在 GitHub 个人设置中勾选显示
- 跨域：本函数默认 `Access-Control-Allow-Origin: *`，同源 Pages 一般无跨域问题



3. **可选：启用精确贡献日历（Pages Functions）**
   - 在项目中添加一个函数 `functions/api/github/contributions.js`（或 .ts），读取环境变量 `GITHUB_TOKEN`，实现与 README 顶部 GraphQL 查询一致的代理逻辑
   - 在 Cloudflare 项目的 Pages 设置里添加环境变量 `GITHUB_TOKEN`
   - 部署后，确保 `config.js` 中：
     ```js
     github: {
       calendarSource: 'auto',
       calendarProxyEndpoint: '/api/github/contributions'
     }
     ```

### 本地精确日历（可选）
- 如果你只想本地预览“精确贡献日历”，可使用本仓库的 `start.py`：
  ```powershell
  # Windows PowerShell（当前会话）
  $env:GITHUB_TOKEN="ghp_your_token"
  python start.py  # 打开 http://localhost:8002
  ```
  ```bash
  # macOS/Linux
  export GITHUB_TOKEN="ghp_your_token"
  python3 start.py
  ```
- Cloudflare Pages 部署仍为纯静态，不依赖该脚本

   - 前端会优先通过该端点获取精确数据，失败时自动回退到 events

### GitHub Pages 部署

```bash
# 推送到 GitHub
git add .
git commit -m "Update personal homepage-public"
git push origin main

# 在仓库设置中启用 GitHub Pages
```

### Vercel 部署

```bash
npm i -g vercel
vercel
```

## 🔧 统一KV配置（可选）

本项目的调色盘和访问统计功能都可以使用同一个 Cloudflare KV 命名空间进行跨设备数据同步：

### 功能对比
| 功能 | 本地存储 | 云端同步（KV） |
|------|----------|----------------|
| 背景调色盘 | ✅ 浏览器本地 | ✅ 跨设备同步 |
| 访问统计 | ✅ 浏览器本地 | ✅ 跨设备统计 |
| 配置要求 | 无 | 需要绑定KV命名空间 |

### 一键配置步骤
1. **创建KV命名空间**：在 Cloudflare Dashboard 创建一个命名空间（例如：`homepage-data`）
2. **绑定到项目**：Pages项目设置 → Functions → KV namespace bindings
   - Variable name: `CHECKIN_KV`
   - KV namespace: 选择刚创建的命名空间
3. **部署生效**：重新部署后，调色盘和访问统计会自动启用云端同步

### 状态指示
- 🎨 **全局主题色已更新**：调色盘成功同步到云端
- 📊 **远程（KV）**：访问统计使用云端存储
- 📱 **仅本地生效**：KV未配置或网络异常

## 🔍 部署前检查清单

- [ ] 个人信息已更新
- [ ] GitHub 用户名配置正确
- [ ] 所有图标链接可访问
- [ ] 社交链接有效
- [ ] 本地测试正常
- [ ] 移动端适配良好

## 📝 注意事项

- ✅ 修改配置后刷新页面即可看到效果
- ✅ GitHub统计数据为真实API数据，非模拟数据
- ✅ 支持完全自定义所有页面内容
- ⚠️ **请保留原作者信息，遵守开源协议**
- 💡 如遇问题，欢迎提交 [Issue](https://github.com/zduu/homepage-public/issues)

## 📄 开源协议

本项目基于原作者的开源协议，请遵守相关条款。

## 🙏 致谢

感谢原作者 [阿布白（IonRh）](https://github.com/IonRh) 提供的优秀开源项目。

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
