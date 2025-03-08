/**
 * 易之 V6.2 - 高级易经演算系统
 * 主应用程序入口文件
 */

// 主应用程序
const YizhiApp = (function() {
    // 保存各个功能模块的引用
    const modules = {};

    // 注册模块
    function registerModule(name, moduleInstance) {
        modules[name] = moduleInstance;
    }

    // 获取模块
    function getModule(name) {
        return modules[name];
    }

    // 初始化应用
    function init() {
        // 初始化所有已注册的模块
        Object.values(modules).forEach(module => {
            if (typeof module.init === 'function') {
                module.init();
            }
        });

        // 执行全局初始化
        initPageNavigation();
        initTabsNavigation();
    }

    // 初始化页面导航
    function initPageNavigation() {
        const navButtons = document.querySelectorAll('.nav-button');
        const sections = document.querySelectorAll('.content-section');

        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.getAttribute('data-section');

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
                    if(section.id === sectionId) {
                        section.classList.add('active');
                    }
                });

                // 如果有对应的模块初始化方法，调用它
                const moduleInstance = modules[sectionId];
                if (moduleInstance && typeof moduleInstance.onActivate === 'function') {
                    moduleInstance.onActivate();
                }
            });
        });
    }

    // 初始化标签页导航
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
                    if(content.id === tabId) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    return {
        registerModule,
        getModule,
        init
    };
})();

// 等待页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 注册模块
    YizhiApp.registerModule('theme', ThemeModule);
    YizhiApp.registerModule('notification', NotificationModule);
    YizhiApp.registerModule('hexagramData', HexagramDataService);
    YizhiApp.registerModule('divination', DivinationModule);
    YizhiApp.registerModule('history', HistoryModule);
    YizhiApp.registerModule('hexagram-analyzer', HexagramAnalyzerModule);
    YizhiApp.registerModule('knowledge', KnowledgeModule);
    YizhiApp.registerModule('search', SearchModule);
    YizhiApp.registerModule('modal', ModalModule);
    YizhiApp.registerModule('help', HelpModule);

    // 初始化应用
    YizhiApp.init();
});