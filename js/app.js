/**
 * 易之 V7.0 - 高级易经演算系统
 * 主应用程序入口文件
 *
 * @version 7.0.0
 * @author 鲛澪
 * @description 现代化易经演算系统，提供完整的占卜、分析和学习功能
 */

// 全局配置
const APP_CONFIG = {
    name: '易之',
    version: '7.0.0',
    debug: false,
    performance: {
        enableMetrics: true,
        logThreshold: 100 // ms
    },
    storage: {
        prefix: 'yizhi_',
        useMemoryFallback: true
    },
    animation: {
        duration: {
            fast: 150,
            normal: 300,
            slow: 500
        }
    }
};

// 工具函数集合
const Utils = {
    /**
     * 防抖函数
     * @param {Function} func 要防抖的函数
     * @param {number} wait 等待时间
     * @param {boolean} immediate 是否立即执行
     */
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },

    /**
     * 节流函数
     * @param {Function} func 要节流的函数
     * @param {number} limit 限制时间
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 深度克隆对象
     * @param {any} obj 要克隆的对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * 格式化日期
     * @param {Date} date 日期对象
     * @param {string} format 格式字符串
     */
    formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },

    /**
     * 延迟执行
     * @param {number} ms 延迟毫秒数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 安全的JSON解析
     * @param {string} str JSON字符串
     * @param {any} defaultValue 默认值
     */
    safeJSONParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch {
            return defaultValue;
        }
    },

    /**
     * 检查元素是否在视口中
     * @param {Element} element DOM元素
     */
    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
};

// 存储管理器（内存存储实现）
const StorageManager = {
    // 内存存储对象
    _memoryStorage: new Map(),

    /**
     * 设置项目
     * @param {string} key 键
     * @param {any} value 值
     */
    setItem(key, value) {
        const fullKey = APP_CONFIG.storage.prefix + key;

        try {
            // 尝试使用 sessionStorage（如果可用）
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(fullKey, JSON.stringify(value));
            } else {
                // 回退到内存存储
                this._memoryStorage.set(fullKey, value);
            }
        } catch (error) {
            console.warn('Storage failed, using memory storage:', error);
            this._memoryStorage.set(fullKey, value);
        }
    },

    /**
     * 获取项目
     * @param {string} key 键
     * @param {any} defaultValue 默认值
     */
    getItem(key, defaultValue = null) {
        const fullKey = APP_CONFIG.storage.prefix + key;

        try {
            // 尝试从 sessionStorage 读取
            if (typeof sessionStorage !== 'undefined') {
                const item = sessionStorage.getItem(fullKey);
                return item ? JSON.parse(item) : defaultValue;
            } else {
                // 从内存存储读取
                return this._memoryStorage.get(fullKey) || defaultValue;
            }
        } catch (error) {
            console.warn('Storage read failed:', error);
            return this._memoryStorage.get(fullKey) || defaultValue;
        }
    },

    /**
     * 移除项目
     * @param {string} key 键
     */
    removeItem(key) {
        const fullKey = APP_CONFIG.storage.prefix + key;

        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem(fullKey);
            }
            this._memoryStorage.delete(fullKey);
        } catch (error) {
            console.warn('Storage removal failed:', error);
            this._memoryStorage.delete(fullKey);
        }
    },

    /**
     * 清空存储
     */
    clear() {
        try {
            if (typeof sessionStorage !== 'undefined') {
                // 只清除应用相关的项目
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith(APP_CONFIG.storage.prefix)) {
                        sessionStorage.removeItem(key);
                    }
                });
            }
            this._memoryStorage.clear();
        } catch (error) {
            console.warn('Storage clear failed:', error);
            this._memoryStorage.clear();
        }
    }
};

// 性能监控器
const PerformanceMonitor = {
    metrics: new Map(),

    /**
     * 开始计时
     * @param {string} name 计时名称
     */
    start(name) {
        if (!APP_CONFIG.performance.enableMetrics) return;
        this.metrics.set(name, { startTime: performance.now() });
    },

    /**
     * 结束计时并记录
     * @param {string} name 计时名称
     */
    end(name) {
        if (!APP_CONFIG.performance.enableMetrics) return;

        const metric = this.metrics.get(name);
        if (metric) {
            const duration = performance.now() - metric.startTime;
            metric.duration = duration;

            if (duration > APP_CONFIG.performance.logThreshold) {
                console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`);
            }

            if (APP_CONFIG.debug) {
                console.log(`Performance: ${name} - ${duration.toFixed(2)}ms`);
            }
        }
    },

    /**
     * 获取性能指标
     * @param {string} name 计时名称
     */
    getMetric(name) {
        return this.metrics.get(name);
    },

    /**
     * 获取所有指标
     */
    getAllMetrics() {
        return Object.fromEntries(this.metrics);
    }
};

// 错误处理器
const ErrorHandler = {
    /**
     * 处理错误
     * @param {Error} error 错误对象
     * @param {string} context 错误上下文
     */
    handle(error, context = 'Unknown') {
        console.error(`[${context}] Error occurred:`, error);

        // 发送错误到通知系统
        if (window.YizhiApp && window.YizhiApp.getModule('notification')) {
            const notificationModule = window.YizhiApp.getModule('notification');
            notificationModule.show('warning', '系统提示',
                `在${context}过程中发生了错误，请稍后重试。`, 5000);
        }

        // 在调试模式下提供更多信息
        if (APP_CONFIG.debug) {
            console.trace('Error stack trace:', error.stack);
        }
    },

    /**
     * 包装异步函数以处理错误
     * @param {Function} asyncFunc 异步函数
     * @param {string} context 上下文
     */
    wrapAsync(asyncFunc, context) {
        return async (...args) => {
            try {
                return await asyncFunc.apply(this, args);
            } catch (error) {
                this.handle(error, context);
                throw error;
            }
        };
    }
};

// 事件总线
const EventBus = {
    events: new Map(),

    /**
     * 监听事件
     * @param {string} event 事件名
     * @param {Function} callback 回调函数
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    },

    /**
     * 触发事件
     * @param {string} event 事件名
     * @param {any} data 事件数据
     */
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    ErrorHandler.handle(error, `Event: ${event}`);
                }
            });
        }
    },

    /**
     * 移除事件监听
     * @param {string} event 事件名
     * @param {Function} callback 回调函数
     */
    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
};

// 确认对话框管理器
const ConfirmDialog = {
    dialog: null,
    resolve: null,

    /**
     * 初始化确认对话框
     */
    init() {
        this.dialog = document.getElementById('confirmDialog');
        const cancelBtn = document.getElementById('confirmCancel');
        const okBtn = document.getElementById('confirmOk');

        cancelBtn.addEventListener('click', () => this.close(false));
        okBtn.addEventListener('click', () => this.close(true));

        // 点击背景关闭
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.close(false);
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dialog.style.display === 'flex') {
                this.close(false);
            }
        });
    },

    /**
     * 显示确认对话框
     * @param {string} title 标题
     * @param {string} message 消息
     * @param {Object} options 选项
     */
    show(title, message, options = {}) {
        return new Promise((resolve) => {
            this.resolve = resolve;

            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;

            // 设置按钮文本
            const cancelBtn = document.getElementById('confirmCancel');
            const okBtn = document.getElementById('confirmOk');

            cancelBtn.textContent = options.cancelText || '取消';
            okBtn.textContent = options.okText || '确定';

            // 设置按钮样式
            okBtn.className = `btn ${options.danger === true ? 'btn-danger' : 'btn-primary'}`;

            this.dialog.style.display = 'flex';
            okBtn.focus();
        });
    },

    /**
     * 关闭对话框
     * @param {boolean} result 结果
     */
    close(result) {
        this.dialog.style.display = 'none';
        if (this.resolve) {
            this.resolve(result);
            this.resolve = null;
        }
    }
};

// 主应用程序
const YizhiApp = (function() {
    // 保存各个功能模块的引用
    const modules = new Map();
    const moduleLoadTimes = new Map();
    let isInitialized = false;
    let loadingOverlay = null;

    /**
     * 注册模块
     * @param {string} name 模块名称
     * @param {Object} moduleInstance 模块实例
     */
    function registerModule(name, moduleInstance) {
        if (modules.has(name)) {
            console.warn(`Module ${name} is already registered`);
            return;
        }

        PerformanceMonitor.start(`register_${name}`);
        modules.set(name, moduleInstance);
        moduleLoadTimes.set(name, Date.now());
        PerformanceMonitor.end(`register_${name}`);

        if (APP_CONFIG.debug) {
            console.log(`Module registered: ${name}`);
        }

        // 触发模块注册事件
        EventBus.emit('module:registered', { name, module: moduleInstance });
    }

    /**
     * 获取模块
     * @param {string} name 模块名称
     */
    function getModule(name) {
        return modules.get(name);
    }

    /**
     * 获取所有模块
     */
    function getAllModules() {
        return Object.fromEntries(modules);
    }

    /**
     * 显示加载状态
     * @param {string} message 加载消息
     */
    function showLoading(message = '正在加载...') {
        if (!loadingOverlay) {
            loadingOverlay = document.getElementById('loadingOverlay');
        }

        if (loadingOverlay) {
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
            loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * 隐藏加载状态
     */
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * 初始化应用程序
     */
    async function init() {
        if (isInitialized) {
            console.warn('App is already initialized');
            return;
        }

        PerformanceMonitor.start('app_init');
        showLoading('正在初始化系统...');

        try {
            // 初始化基础系统
            await initBaseSystems();

            // 初始化所有模块
            await initModules();

            // 初始化UI组件
            await initUIComponents();

            // 初始化事件监听
            initEventListeners();

            // 标记为已初始化
            isInitialized = true;

            // 触发初始化完成事件
            EventBus.emit('app:initialized');

            if (APP_CONFIG.debug) {
                console.log('App initialized successfully');
                console.log('Registered modules:', Array.from(modules.keys()));
                console.log('Performance metrics:', PerformanceMonitor.getAllMetrics());
            }

        } catch (error) {
            ErrorHandler.handle(error, 'App Initialization');
        } finally {
            PerformanceMonitor.end('app_init');

            // 延迟隐藏加载界面，让用户看到加载完成
            setTimeout(hideLoading, 500);
        }
    }

    /**
     * 初始化基础系统
     */
    async function initBaseSystems() {
        showLoading('正在初始化基础系统...');

        // 初始化确认对话框
        ConfirmDialog.init();

        // 初始化全局错误处理
        window.addEventListener('error', (event) => {
            ErrorHandler.handle(event.error, 'Global Error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            ErrorHandler.handle(event.reason, 'Unhandled Promise Rejection');
        });

        await Utils.delay(200); // 模拟初始化时间
    }

    /**
     * 初始化所有模块
     */
    async function initModules() {
        showLoading('正在初始化功能模块...');

        const moduleInitPromises = [];

        for (const [name, module] of modules) {
            if (typeof module.init === 'function') {
                const initPromise = ErrorHandler.wrapAsync(async () => {
                    PerformanceMonitor.start(`init_${name}`);
                    await module.init();
                    PerformanceMonitor.end(`init_${name}`);
                }, `Module Init: ${name}`)();

                moduleInitPromises.push(initPromise);
            }
        }

        // 并行初始化所有模块
        await Promise.allSettled(moduleInitPromises);
    }

    /**
     * 初始化UI组件
     */
    async function initUIComponents() {
        showLoading('正在初始化界面组件...');

        // 初始化页面导航
        initPageNavigation();

        // 初始化标签页导航
        initTabsNavigation();

        // 初始化知识面板导航
        initKnowledgeNavigation();

        // 初始化键盘导航
        initKeyboardNavigation();

        await Utils.delay(200); // 模拟初始化时间
    }

    /**
     * 初始化页面导航
     */
    function initPageNavigation() {
        const navButtons = document.querySelectorAll('.nav-button');
        const sections = document.querySelectorAll('.content-section');

        navButtons.forEach(button => {
            button.addEventListener('click', Utils.throttle(async () => {
                const sectionId = button.getAttribute('data-section');

                PerformanceMonitor.start(`navigate_${sectionId}`);

                // 更新按钮状态
                navButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');

                // 更新内容显示
                sections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === sectionId) {
                        section.classList.add('active');
                    }
                });

                // 触发模块激活
                const moduleInstance = modules.get(sectionId);
                if (moduleInstance && typeof moduleInstance.onActivate === 'function') {
                    try {
                        await moduleInstance.onActivate();
                    } catch (error) {
                        ErrorHandler.handle(error, `Module Activate: ${sectionId}`);
                    }
                }

                // 触发导航事件
                EventBus.emit('navigation:changed', { section: sectionId });

                PerformanceMonitor.end(`navigate_${sectionId}`);
            }, 300));
        });
    }

    /**
     * 初始化标签页导航
     */
    function initTabsNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                const tabsContainer = button.closest('.tabs');

                // 更新按钮状态
                const relatedButtons = tabsContainer.querySelectorAll('.tab-button');
                relatedButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');

                // 更新内容显示
                const relatedContents = tabsContainer.querySelectorAll('.tab-content');
                relatedContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === tabId) {
                        content.classList.add('active');
                    }
                });

                // 触发标签页切换事件
                EventBus.emit('tab:changed', { tabId, container: tabsContainer });
            });
        });
    }

    /**
     * 初始化知识面板导航
     */
    function initKnowledgeNavigation() {
        const knowledgeNavItems = document.querySelectorAll('.knowledge-nav-item');
        const knowledgePanels = document.querySelectorAll('.knowledge-panel');

        knowledgeNavItems.forEach(item => {
            item.addEventListener('click', () => {
                const panelId = item.getAttribute('data-knowledge');

                // 更新导航状态
                knowledgeNavItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // 更新面板显示
                knowledgePanels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === `${panelId}-panel`) {
                        panel.classList.add('active');
                    }
                });
            });
        });
    }

    /**
     * 初始化键盘导航
     */
    function initKeyboardNavigation() {
        // 全局键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Alt + 数字键切换主要功能区
            if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                const keyNumber = parseInt(e.key);
                if (keyNumber >= 1 && keyNumber <= 5) {
                    e.preventDefault();
                    const navButtons = document.querySelectorAll('.nav-button');
                    if (navButtons[keyNumber - 1]) {
                        navButtons[keyNumber - 1].click();
                    }
                }
            }

            // Ctrl + K 快速搜索
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                const searchButton = document.querySelector('[data-section="search"]');
                if (searchButton) {
                    searchButton.click();
                    setTimeout(() => {
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) {
                            searchInput.focus();
                        }
                    }, 100);
                }
            }
        });
    }

    /**
     * 初始化事件监听
     */
    function initEventListeners() {
        // 监听窗口大小变化
        window.addEventListener('resize', Utils.throttle(() => {
            EventBus.emit('window:resize', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        }, 250));

        // 监听在线状态变化
        window.addEventListener('online', () => {
            EventBus.emit('network:online');
        });

        window.addEventListener('offline', () => {
            EventBus.emit('network:offline');
        });

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            EventBus.emit('page:visibility', {
                hidden: document.hidden
            });
        });
    }

    /**
     * 销毁应用程序
     */
    function destroy() {
        // 清理模块
        for (const [name, module] of modules) {
            if (typeof module.destroy === 'function') {
                try {
                    module.destroy();
                } catch (error) {
                    ErrorHandler.handle(error, `Module Destroy: ${name}`);
                }
            }
        }

        // 清理存储
        StorageManager.clear();

        // 重置状态
        modules.clear();
        moduleLoadTimes.clear();
        isInitialized = false;

        console.log('App destroyed');
    }

    /**
     * 重启应用程序
     */
    async function restart() {
        destroy();
        await Utils.delay(100);
        await init();
    }

    /**
     * 获取应用状态
     */
    function getStatus() {
        return {
            initialized: isInitialized,
            modules: Array.from(modules.keys()),
            moduleCount: modules.size,
            performance: PerformanceMonitor.getAllMetrics(),
            config: APP_CONFIG
        };
    }

    // 导出公共API
    return {
        // 核心方法
        registerModule,
        getModule,
        getAllModules,
        init,
        destroy,
        restart,
        getStatus,

        // 工具方法
        utils: Utils,
        storage: StorageManager,
        performance: PerformanceMonitor,
        events: EventBus,
        errors: ErrorHandler,
        confirm: ConfirmDialog,

        // 配置
        config: APP_CONFIG,

        // 状态
        get isInitialized() { return isInitialized; }
    };
})();

// 将 YizhiApp 暴露到全局作用域
window.YizhiApp = YizhiApp;

// DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 等待一个微任务以确保所有同步脚本都已执行
        await new Promise(resolve => setTimeout(resolve, 0));

        // 注册所有模块
        if (typeof ThemeModule !== 'undefined') {
            YizhiApp.registerModule('theme', ThemeModule);
        }
        if (typeof NotificationModule !== 'undefined') {
            YizhiApp.registerModule('notification', NotificationModule);
        }
        if (typeof HexagramDataService !== 'undefined') {
            YizhiApp.registerModule('hexagramData', HexagramDataService);
        }
        if (typeof DivinationModule !== 'undefined') {
            YizhiApp.registerModule('divination', DivinationModule);
        }
        if (typeof HistoryModule !== 'undefined') {
            YizhiApp.registerModule('history', HistoryModule);
        }
        if (typeof HexagramAnalyzerModule !== 'undefined') {
            YizhiApp.registerModule('hexagram-analyzer', HexagramAnalyzerModule);
        }
        if (typeof KnowledgeModule !== 'undefined') {
            YizhiApp.registerModule('knowledge', KnowledgeModule);
        }
        if (typeof SearchModule !== 'undefined') {
            YizhiApp.registerModule('search', SearchModule);
        }
        if (typeof ModalModule !== 'undefined') {
            YizhiApp.registerModule('modal', ModalModule);
        }
        if (typeof HelpModule !== 'undefined') {
            YizhiApp.registerModule('help', HelpModule);
        }

        // 初始化应用
        await YizhiApp.init();

        // 在调试模式下输出状态信息
        if (APP_CONFIG.debug) {
            console.log('易之系统启动完成');
            console.log('应用状态:', YizhiApp.getStatus());
        }

    } catch (error) {
        console.error('应用启动失败:', error);

        // 显示错误信息给用户
        const errorMessage = document.createElement('div');
        errorMessage.className = 'startup-error';
        errorMessage.innerHTML = `
            <div class="error-content">
                <h3>系统启动失败</h3>
                <p>很抱歉，易之系统在启动过程中遇到了问题。</p>
                <button onclick="location.reload()" class="btn btn-primary">重新加载</button>
            </div>
        `;
        document.body.appendChild(errorMessage);
    }
});

// 错误边界 - 捕获未处理的错误
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});