// ==================== 主题切换功能 ====================

// 主题管理类
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.themeToggle = null;
        this.themeIcon = null;
        this.init();
    }

    // 获取存储的主题
    getStoredTheme() {
        return localStorage.getItem('theme');
    }

    // 获取系统主题
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // 存储主题
    setStoredTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    // 应用主题
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.updateThemeIcon(theme);
        this.setStoredTheme(theme);

        // 添加过渡效果类
        document.body.classList.add('theme-transition');

        // 移除过渡效果类（避免影响其他动画）
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    }

    // 更新主题图标
    updateThemeIcon(theme) {
        if (this.themeIcon) {
            if (theme === 'dark') {
                this.themeIcon.className = 'fas fa-moon';
                this.themeToggle.title = '切换到亮色模式';
            } else {
                this.themeIcon.className = 'fas fa-sun';
                this.themeToggle.title = '切换到暗色模式';
            }
        }
    }

    // 切换主题
    toggleTheme() {
        // 添加切换动画类
        if (this.themeToggle) {
            this.themeToggle.classList.add('switching');
            setTimeout(() => {
                this.themeToggle.classList.remove('switching');
            }, 300);
        }

        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    // 初始化
    init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupThemeToggle());
        } else {
            this.setupThemeToggle();
        }

        // 应用初始主题
        this.applyTheme(this.currentTheme);

        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!this.getStoredTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // 设置主题切换按钮
    setupThemeToggle() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = document.getElementById('theme-icon');

        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
            this.updateThemeIcon(this.currentTheme);
        }
    }
}

// 创建主题管理器实例
const themeManager = new ThemeManager();

// GitHub用户名配置 - 从配置文件或全局变量获取
const GITHUB_USERNAME = window.GITHUB_USERNAME ||
    (typeof CONFIG !== 'undefined' && CONFIG.github && CONFIG.github.username) ||
    'zduu'; // 默认用户名，建议在 config.js 中修改

// 获取真实的GitHub统计数据
async function fetchGitHubContributions(username, forceRefresh = false) {
    try {
        // 获取用户基本信息
        const userResponse = await fetch(`https://api.github.com/users/${username}`);
        if (!userResponse.ok) throw new Error('用户API请求失败');
        const userData = await userResponse.json();

        // 获取用户仓库
        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
        if (!reposResponse.ok) throw new Error('仓库API请求失败');
        const repos = await reposResponse.json();

        // 获取最近的提交活动
        const eventsResponse = await fetch(`https://api.github.com/users/${username}/events?per_page=100`);
        const events = eventsResponse.ok ? await eventsResponse.json() : [];

        // 使用GitHub用户数据进行统计
        const githubStats = calculateGitHubStats(userData, repos, events);

        // 暂不更新统计，等待贡献日历计算更准确的连续天数和总数

        // 渲染贡献日历：按配置选择数据源
        const source = (CONFIG && CONFIG.github && CONFIG.github.calendarSource) || 'auto';
        let calendarData = null;
        if (source === 'proxy' || source === 'auto') {
            try {
                calendarData = await fetchCalendarViaProxy(username, forceRefresh);
            } catch (e) {
                if (source === 'proxy') throw e;
                console.warn('proxy 获取失败，回退到 events 估算');
            }
        }
        if (!calendarData) {
            calendarData = buildDailyContribMap(events);
        }
        // 基于贡献日历数据计算总提交和连续天数
        const statsFromCalendar = calculateStatsFromCalendar(calendarData);
        updateGitHubDisplay({
            totalCommits: statsFromCalendar.totalContribs,
            longestStreak: statsFromCalendar.longestStreak,
            currentStreak: statsFromCalendar.currentStreak,
            languages: githubStats.languages
        });
        renderContribCalendar(calendarData);

        // 添加刷新按钮功能
        addRefreshButton(username);

// 通过后端代理获取精确贡献日历（GraphQL）
async function fetchCalendarViaProxy(login, forceRefresh = false) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.github) || {};
    const endpoint = cfg.calendarProxyEndpoint || '/api/github/contributions';

    // 使用用户本地时区的今天，但确保包含完整的当天
    const now = new Date();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const from = new Date(to);
    from.setDate(from.getDate() - 365);
    from.setHours(0, 0, 0, 0);

    const iso = d => d.toISOString();
    const url = `${endpoint}?login=${encodeURIComponent(login)}&from=${encodeURIComponent(iso(from))}&to=${encodeURIComponent(iso(to))}`;

    // 添加缓存破坏参数以确保获取最新数据
    let cacheBuster;
    if (forceRefresh) {
        cacheBuster = Date.now(); // 强制刷新时使用当前时间戳
    } else {
        cacheBuster = Math.floor(Date.now() / (5 * 60 * 1000)); // 每5分钟更新
    }
    const finalUrl = `${url}&_t=${cacheBuster}`;

    const r = await fetch(finalUrl);
    if (!r.ok) throw new Error('proxy failed');
    const data = await r.json(); // { days:[{date,count}], total, colors }
    const map = new Map(data.days.map(d => [d.date, d.count]));
    return { map, start: from, end: to };
}

// 添加刷新GitHub数据的按钮（低调设计）
function addRefreshButton(username) {
    console.log('addRefreshButton 被调用，用户名:', username);

    // 检查是否已经添加了刷新按钮
    if (document.getElementById('github-refresh-btn')) {
        console.log('刷新按钮已存在，跳过添加');
        return;
    }

    const githubSection = document.querySelector('.github-stats') || document.querySelector('#github');
    if (!githubSection) {
        console.log('未找到GitHub统计区域');
        return;
    }

    console.log('找到GitHub统计区域，开始添加刷新按钮');

    // 创建一个小的刷新图标按钮
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'github-refresh-btn';
    refreshBtn.className = 'github-refresh-icon';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    refreshBtn.title = '刷新GitHub数据';

    refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshBtn.title = '正在刷新...';

        try {
            // 强制刷新GitHub数据
            await fetchGitHubContributions(username, true);
            refreshBtn.innerHTML = '<i class="fas fa-check"></i>';
            refreshBtn.title = '刷新完成';
            setTimeout(() => {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshBtn.title = '刷新GitHub数据';
                refreshBtn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('刷新失败:', error);
            refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            refreshBtn.title = '刷新失败，点击重试';
            setTimeout(() => {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshBtn.title = '刷新GitHub数据';
                refreshBtn.disabled = false;
            }, 3000);
        }
    });

    // 将按钮添加到GitHub统计区域
    // 首先尝试找到stats-toggle区域，将按钮添加到其中
    const statsToggle = githubSection.querySelector('.stats-toggle');
    if (statsToggle) {
        console.log('找到stats-toggle区域，添加刷新按钮');
        // 在切换按钮区域添加刷新按钮
        refreshBtn.style.marginLeft = '10px';
        statsToggle.appendChild(refreshBtn);
        console.log('刷新按钮已添加到stats-toggle区域');
    } else {
        console.log('未找到stats-toggle区域，添加到右上角');
        // 如果没有找到stats-toggle，就放在右上角
        githubSection.style.position = 'relative';
        refreshBtn.style.position = 'absolute';
        refreshBtn.style.top = '10px';
        refreshBtn.style.right = '10px';
        refreshBtn.style.zIndex = '10';
        githubSection.appendChild(refreshBtn);
        console.log('刷新按钮已添加到右上角');
    }
}


    } catch (error) {
        console.error('获取GitHub数据失败:', error);
        // 保持默认的模拟数据
        console.log('使用默认数据');
    }
}

// 计算GitHub统计（基于已获取的数据）
function calculateGitHubStats(userData, repos, events) {
    // 统计公开仓库数量和星标数
    const publicRepos = userData.public_repos || 0;
    const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const totalForks = repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);

    // 根据实际数据生成语言分布统计
    const customLanguageStats = [
        { lang: 'JavaScript', percent: Math.min(35, Math.max(20, publicRepos * 2)) },
        { lang: 'Python', percent: Math.min(30, Math.max(15, totalStars * 3)) },
        { lang: 'TypeScript', percent: Math.min(20, Math.max(10, totalForks * 4)) },
        { lang: 'CSS', percent: Math.min(15, Math.max(5, events.length / 2)) }
    ];

    // 确保百分比总和为100
    const total = customLanguageStats.reduce((sum, item) => sum + item.percent, 0);
    customLanguageStats.forEach(item => {
        item.percent = Math.round((item.percent / total) * 100);
    });

    return {
        languages: customLanguageStats,
        publicRepos,
        totalStars,
        totalForks
    };
}

// 基于贡献日历数据计算总提交与连续天数（准确）
function calculateStatsFromCalendar(contrib) {
    const map = contrib.map;
    // 使用本地时区的今天，确保与用户感知的"今天"一致
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - 365);

    let totalContribs = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let currentStreakToday = 0; // 单独保存“以今天结尾”的连续天数

    // 使用本地日期格式进行比较
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // 使用本地日期字符串，避免时区转换问题
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const key = `${year}-${month}-${day}`;

        const count = map.get(key) || 0;
        totalContribs += count;
        if (count > 0) {
            currentStreak += 1;
            if (currentStreak > longestStreak) longestStreak = currentStreak;
        } else {
            currentStreak = 0;
        }
        // 若当前天是“今天”，记录当前连续
        if (d.getTime() === end.getTime()) {
            currentStreakToday = count > 0 ? currentStreak : 0;
        }
    }

    return { totalContribs, longestStreak, currentStreak: currentStreakToday };
}
// ---------- 访问统计（本地存储，自动计数） ----------
async function initCheckin() {
    const todayStatusEl = document.getElementById('visit-today-status');
    const totalEl = document.getElementById('visit-total');
    const storageModeEl = document.getElementById('visit-storage-mode');
    const box = document.getElementById('checkin');
    if (!(todayStatusEl && totalEl && storageModeEl && box)) return;

    const KEY = 'visit:data';
    const todayKey = new Date(); todayKey.setHours(0,0,0,0);

    function load() {
        try { return JSON.parse(localStorage.getItem(KEY)) || { days: [], total: 0 }; }
        catch { return { days: [], total: 0 }; }
    }
    function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

    function fmt(d) { return new Date(d).toISOString().slice(0,10); }

    function render() {
        const data = load();
        const today = fmt(todayKey);
        const todayCount = (data.days || []).filter(d => d === today).length;
        todayStatusEl.textContent = `今日访问 ${todayCount} 次`;
        totalEl.textContent = String(data.total || 0);
    }

    // 页面加载即累计一次访问，并检测存储方式
    (async function autoCount() {
        const data = load();
        const today = fmt(todayKey);
        data.days = data.days || [];
        data.days.push(today);
        data.total = (data.total || 0) + 1;
        save(data);

        // 检测 KV 可用性
        let usingKV = false;
        try {
            // 使用 HEAD 测试端点存在性，避免 404 被误判
            const test = await fetch('/api/checkin?uid=ping', { method: 'GET' });
            usingKV = (test.status === 200);
        } catch (_) { usingKV = false; }

        // 若 KV 可用，同步一次（可忽略失败）
        if (usingKV) {
            try {
                const uid = getOrCreateUID();
                await checkinKV_save(uid, today);
            } catch (e) { /* 忽略 */ }
        }

        if (storageModeEl) storageModeEl.textContent = `存储：${usingKV ? '远程（KV）' : '本地'}`;
        render();
    })();

    // 保留按钮但禁用
    btn.addEventListener('click', (e) => { e.preventDefault(); return false; });
}

// ---------- 可选：将签到同步到 Cloudflare KV ----------
async function checkinKV_isAvailable() {
    try {
        const r = await fetch('/api/checkin?uid=test', { method: 'GET' });
        return r.status !== 501; // 501 代表未配置 KV
    } catch {
        return false;
    }
}

async function checkinKV_load(uid) {
    const r = await fetch(`/api/checkin?uid=${encodeURIComponent(uid)}`);
    if (!r.ok) throw new Error('kv load failed');
    return r.json(); // { days: [] }
}

async function checkinKV_save(uid, day) {
    const r = await fetch(`/api/checkin?uid=${encodeURIComponent(uid)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day })
    });
    if (!r.ok) throw new Error('kv save failed');
    return r.json();
}

function getOrCreateUID() {
    const KEY = 'checkin:uid';
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
        localStorage.setItem(KEY, id);
    }
    return id;
}
// ---------- 自定义栏目初始化（替代原日记统计） ----------
// 注意：原日记统计功能已移至 modules/custom-section.js
// 现在支持多种类型的自定义栏目，可在 modules/custom-section-config.js 中配置

// 保留工具函数供模块使用
function setText(id, val){ const el = document.getElementById(id); if(el) el.textContent = String(val); }
function formatDate(iso){ try{ const d=new Date(iso); return d.toISOString().slice(0,10);}catch{ return iso; } }

// 更新GitHub显示
function updateGitHubDisplay(data) {
    // 更新总提交数
    const totalCommitsElement = document.getElementById('total-commits');
    if (totalCommitsElement) {
        animateNumber(totalCommitsElement, parseInt(totalCommitsElement.textContent.replace(/,/g, '')), data.totalCommits, 2000);
    }

    // 更新最长连续
    const longestStreakElement = document.getElementById('longest-streak');
    if (longestStreakElement) {
        animateNumber(longestStreakElement, parseInt(longestStreakElement.textContent), data.longestStreak, 1500);
    }

    // 更新当前连续
    const currentStreakEl = document.getElementById('current-streak');
    if (currentStreakEl && typeof data.currentStreak === 'number') {
        animateNumber(currentStreakEl, parseInt(currentStreakEl.textContent), data.currentStreak, 1200);
    }

    // 更新语言统计
    if (data.languages && data.languages.length > 0) {
        const languageContainer = document.querySelector('.language-tag').parentElement;
        const languageHTML = data.languages.map(({ lang, percent }) => {
            const className = getLanguageClass(lang);
            return `<span class="language-tag ${className}">${lang} (${percent}%)</span>`;
        }).join('');

        languageContainer.innerHTML = languageHTML;
    }
}

// ---------- 贡献日历：数据聚合 ----------
function buildDailyContribMap(events) {
    // 统计最近 53 周（约一年）
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7 * 53);

    const map = new Map(); // key: YYYY-MM-DD, value: count
    for (const ev of events) {
        if (ev.type !== 'PushEvent') continue;
        const d = new Date(ev.created_at);
        if (d < start) continue;
        const key = d.toISOString().slice(0, 10);
        const count = (ev.payload && ev.payload.commits) ? ev.payload.commits.length : 1;
        map.set(key, (map.get(key) || 0) + count);
    }
    return { map, start, end: today };
}


// ---------- GitHub 风格日历渲染（带月份/星期/图例） ----------
function renderContribCalendar(contrib) {
    const monthsEl = document.getElementById('contrib-months');
    const gridEl = document.getElementById('contrib-grid');
    const legendEl = document.getElementById('contrib-legend');
    const container = document.getElementById('contrib-calendar');
    if (!(monthsEl && gridEl && legendEl && container)) return;

    monthsEl.innerHTML = '';
    gridEl.innerHTML = '';
    legendEl.innerHTML = '';

    const { map } = contrib;

    // 以“周日”为列起点，计算 53 列 x 7 行的范围：end 对齐到最近的周六
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endWeekday = end.getDay(); // 0=Sun ... 6=Sat
    const alignedEnd = new Date(end);
    alignedEnd.setDate(end.getDate() + (6 - endWeekday)); // 下一个周六

    const start = new Date(alignedEnd);
    start.setDate(alignedEnd.getDate() - (53*7 - 1)); // 共 371 天覆盖

    // 渲染格子（按列填充）
    let lastMonth = -1;
    for (let d = new Date(start); d <= alignedEnd; d.setDate(d.getDate() + 1)) {
        // 使用本地日期字符串，避免时区转换问题
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const key = `${year}-${month}-${day}`;
        const count = map.get(key) || 0;
        const level = getLevel(count);
        const cell = document.createElement('div');
        cell.className = 'contrib-day';
        cell.style.backgroundColor = levelColor(level);
        cell.title = `${key}: ${count} contributions`;
        gridEl.appendChild(cell);

        // 月份标签：在“该月的第一周”显示（第一天所在列）
        if (d.getDate() === 1) {
            const daysFromStart = Math.floor((d - start) / (24*3600*1000));
            const columnIndex = Math.floor(daysFromStart / 7);
            const label = document.createElement('span');

            // 检测是否为移动端，显示更简洁的月份标签
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                label.textContent = `${d.getMonth()+1}`;
                label.className = 'month-label-mobile';
            } else {
                label.textContent = `${d.getMonth()+1}月`;
                label.className = 'month-label';
            }

            while (monthsEl.childElementCount < columnIndex) {
                monthsEl.appendChild(document.createElement('span'));
            }
            monthsEl.appendChild(label);
        }
    }
    // 填补剩余的月份栏位至 53 列
    while (monthsEl.childElementCount < 53) monthsEl.appendChild(document.createElement('span'));

    // 图例
    const legend = [0,1,2,3,4];
    legendEl.innerHTML = `少`
        + legend.map(i => `<span class="legend-swatch" style="background:${levelColor(i)}"></span>`).join('')
        + `多`;

    // 添加移动端滚动提示
    addScrollHintForMobile();
}

function addScrollHintForMobile() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    const container = document.getElementById('contrib-calendar');
    const scrollContainer = container.querySelector('.contrib-scroll-container');
    if (!container || !scrollContainer) return;

    // 检查是否需要滚动
    const needsScroll = scrollContainer.scrollWidth > scrollContainer.clientWidth;
    if (!needsScroll) return;

    // 创建滚动提示
    const hint = document.createElement('div');
    hint.className = 'contrib-scroll-hint';
    hint.textContent = '→';
    hint.style.display = 'block';
    container.appendChild(hint);

    // 监听滚动事件，滚动后隐藏提示
    let scrollTimeout;
    scrollContainer.addEventListener('scroll', () => {
        hint.style.opacity = '0.3';
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            hint.style.display = 'none';
        }, 1000);
    });

    // 3秒后自动隐藏提示
    setTimeout(() => {
        if (hint.style.display !== 'none') {
            hint.style.opacity = '0.3';
            setTimeout(() => {
                hint.style.display = 'none';
            }, 500);
        }
    }, 3000);
}

// 监听窗口大小变化，重新检查移动端适配
function handleWindowResize() {
    const calendarContainer = document.getElementById('contrib-calendar');
    if (!calendarContainer) return;

    // 移除现有的滚动提示
    const existingHint = calendarContainer.querySelector('.contrib-scroll-hint');
    if (existingHint) {
        existingHint.remove();
    }

    // 重新添加滚动提示（如果需要）
    setTimeout(() => {
        addScrollHintForMobile();
    }, 100);
}

// 添加窗口大小变化监听器
window.addEventListener('resize', handleWindowResize);





// （旧的简单渲染已移除，使用上方 GitHub 风格渲染）
function getLevel(count) {
    if (count <= 0) return 0;
    if (count < 2) return 1;
    if (count < 5) return 2;
    if (count < 10) return 3;
    return 4;
}

function levelColor(level) {
    switch(level){
        case 1: return getCSSVar('--calendar-level-1');
        case 2: return getCSSVar('--calendar-level-2');
        case 3: return getCSSVar('--calendar-level-3');
        case 4: return getCSSVar('--calendar-level-4');
        default: return getCSSVar('--calendar-level-0');
    }
}

function getCSSVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ---------- 视图切换 ----------
(function initStatsViewToggle(){
    const setup = () => {
        const btnStats = document.getElementById('view-stats');
        const btnCalendar = document.getElementById('view-calendar');
        const btnDiary = document.getElementById('view-diary');
        const statsBlock = document.querySelector('.stats-lines');
        const calendarBlock = document.getElementById('contrib-calendar');
        const diaryBlock = document.querySelector('.diary-stats');

        // 检查自定义栏目是否启用
        const customSectionEnabled = typeof CUSTOM_SECTION_CONFIG !== 'undefined' &&
                                    CUSTOM_SECTION_CONFIG.enabled;

        if(!(btnStats && btnCalendar && statsBlock && calendarBlock)) return;

        // 根据配置显示/隐藏第三个标签页
        if (btnDiary) {
            btnDiary.style.display = customSectionEnabled ? '' : 'none';
        }
        if (diaryBlock) {
            diaryBlock.style.display = 'none';
        }

        const activate = (target) => {
            // 按钮激活态
            [btnStats, btnCalendar, btnDiary].forEach(b => b && b.classList.remove('active'));
            // 内容显隐
            statsBlock.style.display = (target === 'stats') ? '' : 'none';
            calendarBlock.style.display = (target === 'calendar') ? '' : 'none';
            if (diaryBlock && customSectionEnabled) {
                diaryBlock.style.display = (target === 'diary') ? '' : 'none';
            }
            // 设置当前按钮
            if (target === 'stats') btnStats.classList.add('active');
            else if (target === 'calendar') btnCalendar.classList.add('active');
            else if (target === 'diary' && btnDiary && customSectionEnabled) btnDiary.classList.add('active');
        };

        // 绑定事件
        btnStats.addEventListener('click', () => activate('stats'));
        btnCalendar.addEventListener('click', () => activate('calendar'));
        if (btnDiary && customSectionEnabled) {
            btnDiary.addEventListener('click', () => activate('diary'));
        }

        // 初始状态：统计
        activate('stats');
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();


// 获取语言对应的CSS类名
function getLanguageClass(language) {
    const langMap = {
        'JavaScript': 'js',
        'Python': 'py',
        'TypeScript': 'ts',
        'CSS': 'css',
        'HTML': 'css',
        'Java': 'py',
        'C++': 'py',
        'C': 'py',
        'Go': 'py',
        'Rust': 'py'
    };

    return langMap[language] || 'py';
}

// 数字动画函数
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.floor(start + (end - start) * easeOutCubic(progress));
        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// 缓动函数
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// 增强的技能图标悬停效果
function initSkillIcons() {
    const skillIcons = document.querySelectorAll('.skill-icon');

    skillIcons.forEach((icon, index) => {
        // 添加延迟加载动画
        icon.style.animationDelay = `${index * 0.1}s`;
        icon.classList.add('skill-icon-animate-in');

        icon.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.15) rotate(5deg)';
            this.style.boxShadow = '0 15px 35px rgba(255, 255, 255, 0.3)';
            this.style.background = 'rgba(255, 255, 255, 0.25)';

            // // 添加粒子效果
            // createSkillParticles(this);
        });

        icon.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-3px) scale(1) rotate(0deg)';
            this.style.boxShadow = 'none';
            this.style.background = 'rgba(255, 255, 255, 0.1)';
        });

        // 添加点击波纹效果
        icon.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            ripple.className = 'ripple-effect';
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                left: 50%;
                top: 50%;
                width: 20px;
                height: 20px;
                margin-left: -10px;
                margin-top: -10px;
            `;

            this.style.position = 'relative';
            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// // 为技能图标创建粒子效果
// function createSkillParticles(element) {
//     const rect = element.getBoundingClientRect();
//     const particleCount = 6;

//     for (let i = 0; i < particleCount; i++) {
//         const particle = document.createElement('div');
//         particle.style.cssText = `
//             position: fixed;
//             width: 4px;
//             height: 4px;
//             background: rgba(255, 255, 255, 0.8);
//             border-radius: 50%;
//             pointer-events: none;
//             z-index: 1000;
//             left: ${rect.left + rect.width / 2}px;
//             top: ${rect.top + rect.height / 2}px;
//         `;

//         document.body.appendChild(particle);

//         // 随机方向和距离
//         const angle = (i / particleCount) * Math.PI * 2;
//         const distance = 30 + Math.random() * 20;
//         const x = Math.cos(angle) * distance;
//         const y = Math.sin(angle) * distance;

//         particle.animate([
//             { transform: 'translate(0, 0) scale(1)', opacity: 1 },
//             { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 0 }
//         ], {
//             duration: 800,
//             easing: 'ease-out'
//         }).onfinish = () => particle.remove();
//     }
// }

// 修改后的卡片悬停效果
function initCardEffects() {
    const cards = document.querySelectorAll('.site-card, .project-card');

    cards.forEach((card, index) => {
        // 添加入场动画
        card.style.animationDelay = `${index * 0.15}s`;
        card.classList.add('card-animate-in');

        // 添加3D倾斜效果
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / centerY * 8;
            const rotateY = (centerX - x) / centerX * 8;

            this.style.transform = `translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
            this.style.boxShadow = '0 20px 40px rgba(255, 255, 255, 0.15)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-3px) rotateX(0deg) rotateY(0deg) scale(1)';
            this.style.boxShadow = 'none';
        });

        // 添加点击动画
        card.addEventListener('click', function() {
            this.style.transform = 'translateY(-5px) scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'translateY(-8px) scale(1.03)';
            }, 150);

            // 添加点击波纹效果
            createCardRipple(this, event);
        });
    });
}

// 为卡片创建点击波纹效果
function createCardRipple(card, event) {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        animation: cardRipple 0.6s ease-out;
        pointer-events: none;
    `;

    card.style.position = 'relative';
    card.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// 添加CSS动画关键帧
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }

        @keyframes cardRipple {
            to {
                width: 200px;
                height: 200px;
                opacity: 0;
            }
        }

        @keyframes skillIconIn {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes cardIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .skill-icon-animate-in {
            animation: skillIconIn 0.6s ease-out forwards;
        }

        .card-animate-in {
            animation: cardIn 0.8s ease-out forwards;
        }

        .github-stats {
            animation: fadeInUp 0.8s ease-out;
        }
    `;
    document.head.appendChild(style);
}

// 添加平滑的滚动显示动画
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';

                // 为技能图标添加波浪式动画
                if (entry.target.classList.contains('skills-section')) {
                    const skillIcons = entry.target.querySelectorAll('.skill-icon');
                    skillIcons.forEach((icon, index) => {
                        setTimeout(() => {
                            icon.style.opacity = '1';
                            icon.style.transform = 'translateY(0) scale(1)';
                        }, index * 50);
                    });
                }
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // 观察所有卡片元素
    document.querySelectorAll('.site-card, .project-card, .skills-section, .github-stats').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease-out';
        observer.observe(el);
    });
}

// 添加打字机效果到引用文本
function initTypewriterEffect() {
    const quoteElement = document.querySelector('.quote span:last-child');
    if (quoteElement) {
        const text = quoteElement.innerHTML; // 保留HTML标签
        quoteElement.innerHTML = '';
        let i = 0;

        function typeWriter() {
            if (i < text.length) {
                quoteElement.innerHTML = text.substring(0, i + 1);
                i++;
                setTimeout(typeWriter, 50);
            }
        }

        setTimeout(typeWriter, 1000);
    }
}

// 社交链接增强效果
function initSocialLinks() {
    const socialLinks = document.querySelectorAll('.social-links a');

    socialLinks.forEach((link, index) => {
        // 添加延迟动画
        link.style.animationDelay = `${index * 0.1}s`;
        link.classList.add('social-link-animate');

        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.2) rotate(10deg)';
            this.style.boxShadow = '0 10px 25px rgba(255, 255, 255, 0.2)';
        });

        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1) rotate(0deg)';
            this.style.boxShadow = 'none';
        });

        link.addEventListener('click', function(e) {
            e.preventDefault();

            // 创建点击波纹
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                left: 50%;
                top: 50%;
                width: 20px;
                height: 20px;
                margin-left: -10px;
                margin-top: -10px;
            `;

            this.style.position = 'relative';
            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);

            console.log('Social link clicked:', this.querySelector('i').className);
        });
    });
}

// 打开iframe显示ice文件夹中的index.html
let iframeContainer = null; // 全局变量追踪iframe状态

function showIframe() {
    // 如果iframe已经存在，则关闭它
    if (iframeContainer && document.body.contains(iframeContainer)) {
        closeIframe();
        return;
    }

    // 创建iframe容器
    iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 400px;
        height: 720px;
        background: rgb(255 255 255 / 71%);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    // 创建iframe
    const iframe = document.createElement('iframe');
    iframe.height = "240";
    iframe.src = "https://home.loadke.tech/ice/";
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 10px;
        margin-top: 30px;
    `;

    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: #28487a;
        font-size: 20px;
        width: 25px;
        height: 25px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
    `;

    closeBtn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255, 255, 255, 0.3)';
        this.style.transform = 'scale(1.1)';
    });

    closeBtn.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255, 255, 255, 0.2)';
        this.style.transform = 'scale(1)';
    });

    // 关闭功能
    closeBtn.addEventListener('click', closeIframe);

    // ESC键关闭
    const escHandler = function(e) {
        if (e.key === 'Escape' && iframeContainer && document.body.contains(iframeContainer)) {
            closeIframe();
        }
    };
    document.addEventListener('keydown', escHandler);

    // 组装并显示
    iframeContainer.appendChild(iframe);
    iframeContainer.appendChild(closeBtn);
    document.body.appendChild(iframeContainer);

    // 添加进入动画
    iframeContainer.style.opacity = '0';
    iframeContainer.style.animation = 'fadeIn 0.3s ease-out forwards';

    // 添加动画样式
    if (!document.getElementById('iframe-animations')) {
        const style = document.createElement('style');
        style.id = 'iframe-animations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }

            @keyframes fadeOut {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }
}

function closeIframe() {
    if (iframeContainer && document.body.contains(iframeContainer)) {
        iframeContainer.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (document.body.contains(iframeContainer)) {
                document.body.removeChild(iframeContainer);
            }
            iframeContainer = null; // 重置状态
        }, 300);
    }
}


// 访客IP地址获取功能 - 优化版本，提供更精确的位置信息
function fetchVisitorIP() {
    // 尝试多个高精度地理位置API服务
    const geoServices = [
        {
            name: 'ipapi.co',
            url: 'https://ipapi.co/json/',
            parser: (data) => ({
                ip: data.ip,
                country: data.country_name,
                region: data.region,
                city: data.city,
                district: data.region_code, // 地区代码
                isp: data.org,
                timezone: data.timezone,
                postal: data.postal
            })
        },
        {
            name: 'ip-api.com',
            url: 'http://ip-api.com/json/?fields=status,message,country,regionName,city,district,zip,lat,lon,timezone,isp,org,as,query',
            parser: (data) => ({
                ip: data.query,
                country: data.country,
                region: data.regionName,
                city: data.city,
                district: data.district,
                isp: data.isp,
                timezone: data.timezone,
                postal: data.zip,
                lat: data.lat,
                lon: data.lon
            })
        },
        {
            name: 'ipgeolocation.io',
            url: 'https://api.ipgeolocation.io/ipgeo?apiKey=free',
            parser: (data) => ({
                ip: data.ip,
                country: data.country_name,
                region: data.state_prov,
                city: data.city,
                district: data.district,
                isp: data.isp,
                timezone: data.time_zone?.name,
                postal: data.zipcode
            })
        }
    ];

    // 尝试获取地理位置信息
    async function tryGeoService(service) {
        try {
            const response = await fetch(service.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            // 检查响应是否有效
            if (service.name === 'ip-api.com' && data.status === 'fail') {
                throw new Error(data.message || 'API failed');
            }

            return service.parser(data);
        } catch (error) {
            console.warn(`${service.name} 服务失败:`, error);
            throw error;
        }
    }

    // 格式化位置信息，提供更详细的显示
    function formatLocation(geoData) {
        const parts = [];

        // 添加国家
        if (geoData.country) {
            parts.push(geoData.country);
        }

        // 添加省/州
        if (geoData.region && geoData.region !== geoData.country) {
            parts.push(geoData.region);
        }

        // 添加城市
        if (geoData.city && geoData.city !== geoData.region) {
            parts.push(geoData.city);
        }

        // 添加区/县（如果有）
        if (geoData.district && geoData.district !== geoData.city) {
            parts.push(geoData.district);
        }

        return parts.filter(Boolean).join(' ');
    }

    // 格式化IP地址显示
    function formatIP(ip) {
        if (!ip) return '未知IP';

        // IPv6地址截断处理
        if (ip.includes(':') && ip.length > 20) {
            return ip.substring(0, 26) + '...';
        }

        return ip;
    }

    // 依次尝试各个服务
    async function fetchWithFallback() {
        const ipElement = document.getElementById('visitor-ip');
        if (!ipElement) return;

        // 显示加载状态
        ipElement.innerHTML = '定位中...';

        for (const service of geoServices) {
            try {
                console.log(`尝试使用 ${service.name} 获取位置信息...`);
                const geoData = await tryGeoService(service);

                if (geoData.ip) {
                    const displayIP = formatIP(geoData.ip);
                    const location = formatLocation(geoData);

                    // 构建详细的显示信息
                    let displayText = displayIP;
                    if (location) {
                        displayText += `<br><span style="font-size: 0.9em; opacity: 0.8;">(${location} 的好友)</span>`;

                        // 如果有ISP信息，也显示出来
                        if (geoData.isp && geoData.isp !== 'Unknown') {
                            displayText += `<br><span style="font-size: 0.8em; opacity: 0.6;">${geoData.isp}</span>`;
                        }
                    }

                    ipElement.innerHTML = displayText;
                    console.log(`成功使用 ${service.name} 获取位置信息:`, geoData);
                    return; // 成功获取，退出循环
                }
            } catch (error) {
                console.warn(`${service.name} 服务失败，尝试下一个服务...`);
                continue;
            }
        }

        // 所有地理位置服务都失败，使用简单的IP获取服务
        console.log('所有地理位置服务失败，使用备用IP服务...');
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            if (data.ip) {
                const displayIP = formatIP(data.ip);
                ipElement.innerHTML = `${displayIP}<br><span style="font-size: 0.9em; opacity: 0.8;">(位置信息获取失败)</span>`;
            } else {
                throw new Error('无IP数据');
            }
        } catch (error) {
            console.error('所有IP服务都失败:', error);
            ipElement.innerHTML = '无法获取IP地址';
        }
    }

    // 执行获取
    fetchWithFallback();
}

// 时间线增强动画
function initTimelineAnimation() {
    const timelineItems = document.querySelectorAll('.timeline-item');

    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateX(0)';

                    // 为时间线点添加脉冲效果
                    const dot = entry.target.querySelector('.timeline-dot');
                    dot.style.animation = 'pulse 1s ease-in-out';
                }, index * 200);
            }
        });
    }, { threshold: 0.1 });

    timelineItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        item.style.transition = 'all 0.5s ease-out';
        timelineObserver.observe(item);
    });
}

// 添加脉冲动画样式
function addPulseAnimation() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.5); box-shadow: 0 0 20px rgba(116, 185, 255, 0.6); }
            100% { transform: scale(1); }
        }

        @keyframes socialLinkIn {
            from {
                opacity: 0;
                transform: translateY(20px) rotate(-10deg);
            }
            to {
                opacity: 1;
                transform: translateY(0) rotate(0deg);
            }
        }

        .social-link-animate {
            animation: socialLinkIn 0.6s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
}

// 添加粒子背景效果
function createParticles() {
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: ${2 + Math.random() * 3}px;
            height: ${2 + Math.random() * 3}px;
            background: rgba(255, 255, 255, ${0.3 + Math.random() * 0.4});
            border-radius: 50%;
            pointer-events: none;
            z-index: -1;
            left: ${Math.random() * 100}vw;
            top: ${Math.random() * 100}vh;
            animation: particleFloat ${3 + Math.random() * 4}s ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
        `;

        document.body.appendChild(particle);
    }

    // 添加粒子动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes particleFloat {
            0%, 100% {
                transform: translateY(0px) translateX(0px) rotate(0deg);
                opacity: 0.3;
            }
            25% {
                transform: translateY(-20px) translateX(10px) rotate(90deg);
                opacity: 1;
            }
            50% {
                transform: translateY(-10px) translateX(-10px) rotate(180deg);
                opacity: 0.5;
            }
            75% {
                transform: translateY(-30px) translateX(5px) rotate(270deg);
                opacity: 0.8;
            }
        }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    addPulseAnimation();

    // 初始化自定义栏目（替代原日记统计）
    if (typeof initCustomSection === 'function') {
        initCustomSection();
    }
    // 获取真实GitHub数据
    fetchVisitorIP()
    fetchGitHubContributions(GITHUB_USERNAME);

    // 初始化签到
    initCheckin();

    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    if (!isMobile) {
        // 只在非移动设备上加载动画
        initSkillIcons();
        initCardEffects();
        initScrollAnimations();
        initTypewriterEffect();
        createParticles();
        initSocialLinks();
        initTimelineAnimation();
    }
});

// 添加页面加载动画
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';

    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// 添加开发者工具检测和信息提示
function detectDevTools() {
    let devtools = false;

    // 检测开发者工具是否打开
    function checkDevTools() {
        const threshold = 160;

        if (window.outerHeight - window.innerHeight > threshold ||
            window.outerWidth - window.innerWidth > threshold) {
            if (!devtools) {
                devtools = true;
                showDevToolsMessage();
            }
        } else {
            if (devtools) {
                devtools = false;
                hideDevToolsMessage();
            }
        }
    }

    // 显示开发者工具信息
    function showDevToolsMessage() {
        // 控制台输出样式化信息
        console.clear();
        console.log('%c🎉 欢迎来到作者 IonRh的个人主页！', 'color: #74b9ff; font-size: 20px; font-weight: bold;');
        console.log('%c👋 作者 IonRh的博客：https://blog.loadke.tech！', 'color: #00b894; font-size: 16px; font-weight: bold;');
        console.log('%c📧 联系作者 IonRh：https://t.me/IonMagic', 'color: #fdcb6e; font-size: 14px;');
        console.log('%c🌟 GitHub：https://github.com/IonRh', 'color: #e17055; font-size: 14px;');
        console.log('%c🚀 喜欢探索新技术，欢迎交流合作！', 'color: #fd79a8; font-size: 14px;');
        console.log('%c💡 个人使用，请保留出处哦~', 'color: #00cec9; font-size: 14px;');

        // 添加ASCII艺术
        console.log(`
%c  ██╗ ██████╗ ███╗   ██╗██████╗ ██╗  ██╗
  ██║██╔═══██╗████╗  ██║██╔══██╗██║  ██║
  ██║██║   ██║██╔██╗ ██║██████╔╝███████║
  ██║██║   ██║██║╚██╗██║██╔══██╗██╔══██║
  ██║╚██████╔╝██║ ╚████║██║  ██║██║  ██║
  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝
        `, 'color: #74b9ff; font-family: monospace;');

        // 页面右下角显示提示框
        createDevToolsNotification();

        // 检测右键和特定按键
        detectInspectActions();
    }

    function hideDevToolsMessage() {
        const notification = document.getElementById('devtools-notification');
        if (notification) {
            notification.remove();
        }
    }

    // 创建开发者工具通知
    function createDevToolsNotification() {
        // 移除已存在的通知
        const existingNotification = document.getElementById('devtools-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'devtools-notification';
        notification.innerHTML = `
            <div class="devtools-content">
                <div class="devtools-header">
                    <span>🛠️ 开发者模式</span>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="devtools-body">
                    <p>👋 你好，开发者朋友！</p>
                    <p>📧 联系：<a href="https://t.me/IonMagic">https://t.me/IonMagic</a></p>
                    <p>🌟 GitHub：<a href="https://github.com/IonRh" target="_blank">@IonRh</a></p>
                </div>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 300px;
            background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 15px;
            color: white;
            z-index: 10000;
            animation: slideInUp 0.5s ease-out;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        document.body.appendChild(notification);

        // 5秒后自动消失
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutDown 0.5s ease-in';
                setTimeout(() => notification.remove(), 500);
            }
        }, 8000);
    }

    // 检测右键点击和检查元素
    function detectInspectActions() {
        // 检测右键菜单
        document.addEventListener('contextmenu', function(e) {
            console.log('%c🖱️ 检测到右键点击 - 准备查看源码？', 'color: #ffeaa7; font-size: 14px;');
        });

        // 检测F12按键
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12') {
                console.log('%c⌨️ F12 - 欢迎使用开发者工具！', 'color: #81ecec; font-size: 14px;');
            }

            // 检测Ctrl+Shift+I
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                console.log('%c⌨️ Ctrl+Shift+I - 开发者快捷键！', 'color: #fab1a0; font-size: 14px;');
            }

            // 检测Ctrl+U (查看源码)
            if (e.ctrlKey && e.key === 'u') {
                console.log('%c📄 查看页面源码 - 探索代码结构吧！', 'color: #ff7675; font-size: 14px;');
            }
        });
    }

    // 添加通知动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInUp {
            from {
                transform: translateY(100px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes slideOutDown {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(100px);
                opacity: 0;
            }
        }

        #devtools-notification .devtools-content {
            padding: 15px;
        }

        #devtools-notification .devtools-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            font-weight: bold;
            font-size: 14px;
        }

        #devtools-notification .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.3s;
        }

        #devtools-notification .close-btn:hover {
            background: rgba(255,255,255,0.2);
        }

        #devtools-notification .devtools-body p {
            margin: 5px 0;
            font-size: 12px;
        }

        #devtools-notification .devtools-body a {
            color: #74b9ff;
            text-decoration: none;
        }

        #devtools-notification .devtools-body a:hover {
            text-decoration: underline;
        }

        #devtools-notification .tech-stack {
            margin-top: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }

        #devtools-notification .tech-tag {
            background: rgba(116, 185, 255, 0.2);
            color: #74b9ff;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            border: 1px solid rgba(116, 185, 255, 0.3);
        }
    `;
    document.head.appendChild(style);

    // 定期检测开发者工具状态
    setInterval(checkDevTools, 500);
}

// 初始化开发者工具检测
document.addEventListener('DOMContentLoaded', function() {
    detectDevTools();
});
