/**
 * 自定义栏目配置文件
 *
 * 在这里配置第三个标签页的内容和行为
 * 支持多种类型：日记统计、项目展示、自定义内容等
 *
 * 注意：日记功能需要远程API支持，本地测试也需要调用远程API
 */

const CUSTOM_SECTION_CONFIG = {
    // 是否启用自定义栏目（设置为 false 将完全隐藏第三个标签页）
    enabled: true,

    // 栏目类型：'diary' | 'projects' | 'custom' | 'disabled'
    type: 'diary',

    // 标签页显示的标题
    title: '日记',

    // 图标类名（FontAwesome）
    icon: 'fas fa-book',

    // 根据不同类型的具体配置
    config: {
        // === 日记统计配置 (type: 'diary') ===
        // 重要：日记功能需要远程API支持，本地测试也需要调用远程API
        // 根据API文档，支持无认证访问，也可以配置API密钥
        endpoint: "https://diary.edxx.de/api/stats",
        authType: "x-api-key",  // 'x-api-key' | 'bearer' | 'query'
        apiKey: "", // API密钥（可选，留空表示无认证访问）

        // === 项目展示配置 (type: 'projects') ===
        projects: [
            {
                name: "个人主页",
                description: "基于原生技术构建的响应式个人主页",
                status: "completed", // completed | in-progress | planned
                github: "https://github.com/username/homepage",
                demo: "https://example.com"
            },
            {
                name: "博客系统",
                description: "简洁的个人博客系统",
                status: "in-progress",
                github: "https://github.com/username/blog",
                demo: null
            }
        ],

        // === 自定义内容配置 (type: 'custom') ===
        html: `
            <div class="custom-stats-grid">
                <div class="stat-item">
                    <span class="stat-label">自定义指标1</span>
                    <span class="stat-number" id="custom-metric-1">--</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">自定义指标2</span>
                    <span class="stat-number" id="custom-metric-2">--</span>
                </div>
            </div>
            <div class="custom-content-text">
                <p>这里可以放置任何自定义内容</p>
            </div>
        `,
        
        // 自定义JavaScript代码（可选）
        javascript: `
            // 示例：设置自定义指标的值
            document.getElementById('custom-metric-1')?.textContent = '42';
            document.getElementById('custom-metric-2')?.textContent = '100%';
            
            // 可以在这里添加任何自定义逻辑
            console.log('自定义栏目已加载');
        `
    }
};

// ==================== 快速配置示例 ====================
//
// 要使用以下配置，请将对应的配置复制到上面的 CUSTOM_SECTION_CONFIG 中
//
// 1. 完全禁用第三个标签页：
//    Object.assign(CUSTOM_SECTION_CONFIG, { enabled: false });
//
// 2. 使用项目展示：
//    Object.assign(CUSTOM_SECTION_CONFIG, {
//        enabled: true,
//        type: 'projects',
//        title: '项目',
//        icon: 'fas fa-folder',
//        config: { projects: [...] }
//    });
//
// 3. 自定义内容示例请参考 CUSTOM_SECTION_README.md

// 导出配置供其他模块使用
if (typeof window !== 'undefined') {
    window.CUSTOM_SECTION_CONFIG = CUSTOM_SECTION_CONFIG;
}
