/**
 * 易之 V7.0 - 高级易经演算系统
 * 功能模块实现
 *
 * @version 7.0.0
 * @author 鲛澪
 * @description 包含所有核心功能模块的实现
 */

/**
 * 主题模块 - 管理应用程序的主题
 */
const ThemeModule = (function() {
    // 私有变量
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const STORAGE_KEY = 'theme';

    // 初始化
    function init() {
        try {
            // 检查存储中的主题设置
            const savedTheme = YizhiApp.storage.getItem(STORAGE_KEY);
            if (savedTheme === 'dark') {
                body.setAttribute('data-theme', 'dark');
            }

            // 为主题切换按钮添加事件监听器
            if (themeToggle) {
                themeToggle.addEventListener('click', toggleTheme);
                themeToggle.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleTheme();
                    }
                });
            }

            // 监听系统主题变化
            if (window.matchMedia) {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                mediaQuery.addListener(handleSystemThemeChange);
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Theme Module Init');
        }
    }

    // 切换主题
    function toggleTheme() {
        try {
            const currentTheme = getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Theme Toggle');
        }
    }

    // 设置主题
    function setTheme(theme) {
        try {
            if (theme === 'dark') {
                body.setAttribute('data-theme', 'dark');
                YizhiApp.storage.setItem(STORAGE_KEY, 'dark');
            } else {
                body.removeAttribute('data-theme');
                YizhiApp.storage.setItem(STORAGE_KEY, 'light');
            }

            // 触发主题变化事件
            YizhiApp.events.emit('theme:changed', { theme });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Set Theme');
        }
    }

    // 获取当前主题
    function getCurrentTheme() {
        return body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    // 处理系统主题变化
    function handleSystemThemeChange(e) {
        // 如果用户没有手动设置主题，则跟随系统
        const userTheme = YizhiApp.storage.getItem(STORAGE_KEY);
        if (!userTheme) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    }

    return {
        init,
        setTheme,
        getCurrentTheme,
        toggleTheme
    };
})();

/**
 * 通知模块 - 管理应用程序中的通知
 */
const NotificationModule = (function() {
    // 私有变量
    const container = document.getElementById('notificationContainer');
    let notificationCount = 0;
    const maxNotifications = 5;
    const notifications = new Map();

    // 初始化
    function init() {
        try {
            // 确保容器存在
            if (!container) {
                console.warn('Notification container not found');
                return;
            }

            // 监听网络状态变化
            YizhiApp.events.on('network:offline', () => {
                show('warning', '网络连接', '网络连接已断开，某些功能可能受到影响。');
            });

            YizhiApp.events.on('network:online', () => {
                show('success', '网络连接', '网络连接已恢复。');
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Notification Module Init');
        }
    }

    // 显示通知
    function show(type, title, message, duration = 5000, options = {}) {
        try {
            if (notificationCount >= maxNotifications) {
                // 移除最旧的通知
                const oldestNotification = notifications.values().next().value;
                if (oldestNotification) {
                    removeNotification(oldestNotification.element);
                }
            }

            notificationCount++;

            // 创建通知元素
            const notification = document.createElement('div');
            const notificationId = YizhiApp.utils.generateId();
            notification.className = `notification notification-${type}`;
            notification.setAttribute('role', 'alert');
            notification.setAttribute('data-id', notificationId);

            // 添加通知图标
            const iconPath = getIconPath(type);

            // 设置通知内容
            notification.innerHTML = `
                <svg class="notification-icon icon" viewBox="0 0 24 24" aria-hidden="true">
                    ${iconPath}
                </svg>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(title)}</div>
                    <div class="notification-message">${escapeHtml(message)}</div>
                    ${options.actions ? createActionButtons(options.actions) : ''}
                </div>
                <button class="notification-close" aria-label="关闭通知">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                    </svg>
                </button>
            `;

            // 添加到容器
            container.appendChild(notification);

            // 保存通知引用
            notifications.set(notificationId, {
                element: notification,
                timestamp: Date.now()
            });

            // 添加关闭通知的事件监听器
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => {
                removeNotification(notification);
            });

            // 处理操作按钮
            if (options.actions) {
                const actionBtns = notification.querySelectorAll('.notification-action');
                actionBtns.forEach((btn, index) => {
                    btn.addEventListener('click', () => {
                        const action = options.actions[index];
                        if (action.handler) {
                            action.handler();
                        }
                        if (action.closeOnClick !== false) {
                            removeNotification(notification);
                        }
                    });
                });
            }

            // 点击通知主体
            if (options.onClick) {
                notification.addEventListener('click', (e) => {
                    if (!e.target.closest('.notification-close') && !e.target.closest('.notification-action')) {
                        options.onClick();
                        if (options.closeOnClick !== false) {
                            removeNotification(notification);
                        }
                    }
                });
            }

            // 设置自动消失
            if (duration > 0) {
                setTimeout(() => {
                    if (container.contains(notification)) {
                        removeNotification(notification);
                    }
                }, duration);
            }

            // 添加入场动画
            requestAnimationFrame(() => {
                notification.classList.add('notification-enter');
            });

        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Notification');
        }
    }

    // 移除通知
    function removeNotification(notification) {
        try {
            const notificationId = notification.getAttribute('data-id');

            notification.classList.add('exiting');
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                    notificationCount--;

                    if (notificationId) {
                        notifications.delete(notificationId);
                    }
                }
            }, 300); // 与通知退出动画持续时间匹配
        } catch (error) {
            YizhiApp.errors.handle(error, 'Remove Notification');
        }
    }

    // 获取图标路径
    function getIconPath(type) {
        const icons = {
            success: '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path>',
            info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>',
            warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>',
            error: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>'
        };
        return icons[type] || icons.info;
    }

    // 创建操作按钮
    function createActionButtons(actions) {
        return `
            <div class="notification-actions">
                ${actions.map(action => `
                    <button class="notification-action btn btn-sm ${action.className || ''}">${escapeHtml(action.text)}</button>
                `).join('')}
            </div>
        `;
    }

    // HTML转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 清除所有通知
    function clearAll() {
        try {
            const allNotifications = container.querySelectorAll('.notification');
            allNotifications.forEach(notification => {
                removeNotification(notification);
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Clear All Notifications');
        }
    }

    return {
        init,
        show,
        clearAll
    };
})();

/**
 * 卦象数据服务 - 管理易经卦象数据
 */
const HexagramDataService = (function() {
    // 八卦数据
    const baguaData = {
        "乾": {
            symbol: "☰",
            binary: "111",
            nature: "天",
            attribute: "刚健、创造",
            direction: "西北",
            animal: "马",
            element: "金",
            family: "父"
        },
        "坤": {
            symbol: "☷",
            binary: "000",
            nature: "地",
            attribute: "柔顺、包容",
            direction: "西南",
            animal: "牛",
            element: "土",
            family: "母"
        },
        "震": {
            symbol: "☳",
            binary: "001",
            nature: "雷",
            attribute: "动、生发",
            direction: "东",
            animal: "龙",
            element: "木",
            family: "长男"
        },
        "巽": {
            symbol: "☴",
            binary: "110",
            nature: "风",
            attribute: "入、顺从",
            direction: "东南",
            animal: "鸡",
            element: "木",
            family: "长女"
        },
        "坎": {
            symbol: "☵",
            binary: "010",
            nature: "水",
            attribute: "陷、险",
            direction: "北",
            animal: "猪",
            element: "水",
            family: "中男"
        },
        "离": {
            symbol: "☲",
            binary: "101",
            nature: "火",
            attribute: "丽、明",
            direction: "南",
            animal: "雉",
            element: "火",
            family: "中女"
        },
        "艮": {
            symbol: "☶",
            binary: "100",
            nature: "山",
            attribute: "止、限制",
            direction: "东北",
            animal: "狗",
            element: "土",
            family: "少男"
        },
        "兑": {
            symbol: "☱",
            binary: "011",
            nature: "泽",
            attribute: "悦、喜",
            direction: "西",
            animal: "羊",
            element: "金",
            family: "少女"
        }
    };

        const hexagramsData = {
        "1": {
            "name": "乾",
            "unicode": "\u4DC0",
            "binary": "111111",
            "explanation": "自强不息",
            "overview": "乾为天，象征纯阳、刚健、创造与领导。乾卦代表一个人充满活力、具有创造力和领导才能的阶段。",
            "detail": "乾卦由六个阳爻组成，代表纯粹的创造力和领导力。乾象征着天的特质：强大、活跃、持续不断的运动和变化。在个人层面，乾卦鼓励我们采取主动，勇往直前，但也提醒我们要保持谦逊，不过分自信，避免傲慢。乾卦的精神是'自强不息'，告诉我们要不断努力，持续前进。",
            "lines": [
                { "position": 1, "content": "初九，潜龙勿用。潜伏修身，不要轻举妄动。" },
                { "position": 2, "content": "九二，见龙在田，利见大人。才能开始显露，适合与德高望重的人交往。" },
                { "position": 3, "content": "九三，君子终日乾乾，夕惕若厉，无咎。保持警惕与勤奋，才能避免危险。" },
                { "position": 4, "content": "九四，或跃在渊，无咎。时机未到，继续蓄势待发。" },
                { "position": 5, "content": "九五，飞龙在天，利见大人。才能得到充分发挥，适合与有影响力的人合作。" },
                { "position": 6, "content": "上九，亢龙有悔。过于高傲必有后悔，提醒要懂得适可而止。" }
            ]
        },
        "2": {
            "name": "坤",
            "unicode": "\u4DC1",
            "binary": "000000",
            "explanation": "厚德载物",
            "overview": "坤为地，象征纯阴、包容、承载与顺从。坤卦代表需要等待、包容和滋养的时期。",
            "detail": "坤卦由六个阴爻组成，代表大地的特质：宽容、承载、滋养。坤卦提醒我们要有耐心，学会等待，保持谦逊顺从的态度。坤的精神是'厚德载物'，告诉我们要像大地一样宽容包容，蓄积能量，等待合适的时机。在事业中，坤卦建议我们要勤勉、踏实、耐心。",
            "lines": [
                { "position": 1, "content": "初六，履霜，坚冰至。见微知著，提醒要有远见。" },
                { "position": 2, "content": "六二，直方大，不习无不利。坚持正直与方正，不用刻意追求，自然会有好结果。" },
                { "position": 3, "content": "六三，含章可贞，或从王事，无成有终。内心丰富充实，即使没有显著成就，最终也会圆满。" },
                { "position": 4, "content": "六四，括囊无咎无誉。谨慎行事，不求名利，无过亦无功。" },
                { "position": 5, "content": "六五，黄裳元吉。穿黄色衣服，象征中正之道，非常吉祥。" },
                { "position": 6, "content": "上六，龙战于野，其血玄黄。过度争斗会导致两败俱伤。" }
            ]
        },
        "3": {
            "name": "屯",
            "unicode": "\u4DC2",
            "binary": "010001",
            "explanation": "起始维艰",
            "overview": "屯为雷地，象征初始的困难与挑战。屯卦代表事物的初始阶段，充满了不确定性和困难。",
            "detail": "屯卦由震卦(雷)上坤卦(地)下组成，象征着万物初生时的艰难。雷在地中，有阻塞之象。屯卦提醒我们在开始任何事业时都会遇到困难，需要坚持、谨慎和毅力。屯卦教导我们在起步阶段要找到正确的方向，寻求贤能之人的帮助，并且保持耐心。",
            "lines": [
                { "position": 1, "content": "初九，磐桓，利居贞，利建侯。遇到阻碍时，应当停下来思考，保持正道，适合建立根基。" },
                { "position": 2, "content": "六二，屯如邅如，乘马班如，匪寇婚媾，女子贞不字，十年乃字。处于困境中如同迷路，但这是暂时的，需要耐心等待转机。" },
                { "position": 3, "content": "六三，即鹿无虞，惟入于林中，君子几不如舍，往吝。追逐目标如同没有准备好就去打猎，容易陷入困境，不如暂时放弃。" },
                { "position": 4, "content": "六四，乘马班如，求婚媾，往吉，无不利。耐心等待后会有转机，前进会有好结果。" },
                { "position": 5, "content": "九五，屯其膏，小贞吉，大贞凶。在困难中积累资源，小事谨慎有利，大事则不宜冒进。" },
                { "position": 6, "content": "上六，乘马班如，泣血涟如。初始阶段过后仍不见好转，甚为艰难。" }
            ]
        },
        "4": {
            "name": "蒙",
            "unicode": "\u4DC3",
            "binary": "100010",
            "explanation": "启蒙奋发",
            "overview": "蒙为山水，象征蒙昧与启蒙。蒙卦代表需要学习和指导的阶段。",
            "detail": "蒙卦由艮卦(山)上坎卦(水)下组成，象征着蒙昧无知，需要教育和启发。山下有水，水源被阻，不能畅流，如同人的智慧被遮蔽。蒙卦提醒我们要正视自己的无知，寻求适当的教育和指导。在人生的初始阶段，我们都需要启蒙和指导，而正确的引导对未来发展至关重要。",
            "lines": [
                { "position": 1, "content": "初六，发蒙，利用刑人，用说桎梏，以往吝。启蒙教育应当及时，可适当采用严厉的方式，但过度则不利。" },
                { "position": 2, "content": "九二，包蒙吉，纳妇吉，子克家。包容蒙昧是吉祥的，比喻男子娶贤慧的妻子有利于家庭和谐。" },
                { "position": 3, "content": "六三，勿用取女，见金夫，不有躬，无攸利。不要娶轻浮的女子，看到表面强硬的男子也不要盲从，这时不宜行动。" },
                { "position": 4, "content": "六四，困蒙，吝。陷入蒙昧状态而不自知，将会有困难。" },
                { "position": 5, "content": "六五，童蒙，吉。保持童心与求知欲，虚心学习是吉祥的。" },
                { "position": 6, "content": "上九，击蒙，不利为寇，利御寇。对付蒙昧要采取主动，但不宜进攻，适合防御。" }
            ]
        },
        "5": {
            "name": "需",
            "unicode": "\u4DC4",
            "binary": "010111",
            "explanation": "守正待机",
            "overview": "需为水天，象征等待与准备。需卦代表需要等待适当时机的阶段。",
            "detail": "需卦由坎卦(水)上乾卦(天)下组成，象征着云雨积聚却尚未降下的状态，含有等待和准备的意义。需卦教导我们有些事情不能操之过急，需要等待适当的时机。但这种等待不是消极的，而是应该充分利用这个时间做好准备。需卦的中心思想是'守正待机'：在等待的过程中，应该保持正直的品格和积极的态度。",
            "lines": [
                { "position": 1, "content": "初九，需于郊，利用恒，无咎。在荒郊等待，保持恒心，没有危险。" },
                { "position": 2, "content": "九二，需于沙，小有言，终吉。在沙地等待，虽有小的不顺，但最终吉祥。" },
                { "position": 3, "content": "九三，需于泥，致寇至。在泥泞中等待，会招致危险。" },
                { "position": 4, "content": "六四，需于血，出自穴。在危险处等待，最终能脱险。" },
                { "position": 5, "content": "九五，需于酒食，贞吉。在欢乐中等待，坚守正道，吉祥。" },
                { "position": 6, "content": "上六，入于穴，有不速之客三人来，敬之终吉。陷入困境，意外有人前来帮助，尊重他们会有好结果。" }
            ]
        },
        "6": {
            "name": "讼",
            "unicode": "\u4DC5",
            "binary": "111010",
            "explanation": "慎争戒讼",
            "overview": "讼为天水，象征争讼与冲突。讼卦代表遇到阻碍与争端的阶段。",
            "detail": "讼卦由乾卦(天)上坎卦(水)下组成，天与水相违背，象征着矛盾与争执。讼卦提醒我们争端往往没有赢家，应当尽量避免争斗，和平解决纠纷。如果必须面对冲突，应当坚持真理，保持公正，但不要陷入过分的争执中。讼卦的核心是'慎争戒讼'，教导我们要以理性和道德的方式处理冲突。",
            "lines": [
                { "position": 1, "content": "初六，不永所事，小有言，终吉。不要纠缠于小事，虽有小争执，最终会平息。" },
                { "position": 2, "content": "九二，不克讼，归而逋，其邑人三百户，无眚。不要执意争讼，适时退让，即使失去一些利益，也不会有大灾祸。" },
                { "position": 3, "content": "六三，食旧德，贞厉，终吉。或从王事，无成。依靠过去的功德生活，坚持原则虽有风险但最终吉祥。参与公共事务或许不能成功。" },
                { "position": 4, "content": "九四，不克讼，复即命渝，安贞吉。不要执著于争讼，回归本职，安心守正道，吉祥。" },
                { "position": 5, "content": "九五，讼，元吉。争讼中获得公正的裁决，大吉大利。" },
                { "position": 6, "content": "上九，或锡之鞶带，终朝三褫之。即使获得荣誉和权力，也可能很快失去，警示不要陷入争端。" }
            ]
        },
        "7": {
            "name": "师",
            "unicode": "\u4DC6",
            "binary": "000010",
            "explanation": "行险而顺",
            "overview": "师为地水，象征军队与纪律。师卦代表需要组织、纪律和领导的阶段。",
            "detail": "师卦由坤卦(地)上坎卦(水)下组成，象征着军队行进在危险的道路上。师卦强调纪律、组织和领导的重要性。就像军队需要严格的纪律和明智的指挥一样，我们在面对挑战时也需要有序的组织和明确的方向。师卦提醒我们，胜利不仅仅依靠力量，更依靠策略和纪律。'行险而顺'指的是即使面临危险，只要保持正确的行为方式，仍能取得成功。",
            "lines": [
                { "position": 1, "content": "初六，师出以律，否臧凶。军队出征必须严守纪律，否则会有凶险。" },
                { "position": 2, "content": "九二，在师中吉，无咎，王三锡命。处于军队中心位置，能够得到赏识，无灾祸。" },
                { "position": 3, "content": "六三，师或舆尸，凶。军队运载尸体而归，表示战败，凶险。" },
                { "position": 4, "content": "六四，师左次，无咎。军队在左边安营扎寨，没有灾祸。" },
                { "position": 5, "content": "六五，田有禽，利执言，无咎。长子帅师，弟子舆尸，贞凶。猎场上有猎物，适合发布命令，无灾祸。但如果长子领军而弟弟运尸，则意味着不顺，有凶险。" },
                { "position": 6, "content": "上六，大君有命，开国承家，小人勿用。君王颁布命令，建立国家，承袭家业，不要任用小人。" }
            ]
        },
        "8": {
            "name": "比",
            "unicode": "\u4DC7",
            "binary": "010000",
            "explanation": "诚信团结",
            "overview": "比为水地，象征亲近与团结。比卦代表需要合作、结盟和相互支持的阶段。",
            "detail": "比卦由坎卦(水)上坤卦(地)下组成，象征水滋润大地，万物相亲相辅。比卦强调团结、合作和诚信的重要性。在现代社会中，很少有人能完全独立完成重大任务，我们需要与他人合作，建立互信关系。比卦提醒我们，选择正确的伙伴至关重要，同时也要成为一个值得信赖的人。'诚信团结'是比卦的核心，告诉我们真诚地对待他人，共同努力才能取得成功。",
            "lines": [
                { "position": 1, "content": "初六，有孚比之，无咎。先号咷而后笑，大师克相遇。以诚信结盟，没有灾祸。虽有波折，最终能够相遇相合。" },
                { "position": 2, "content": "六二，比之自内，贞吉。从内心真诚结盟，坚守正道，吉祥。" },
                { "position": 3, "content": "六三，比之匪人。与不当结交的人亲近，有危险。" },
                { "position": 4, "content": "六四，外比之，贞吉。与外部的人结盟，坚守正道，吉祥。" },
                { "position": 5, "content": "九五，显比，王用三驱，失前禽，邑人不诫，吉。公开结盟，君王三次出猎，虽然失去前面的猎物，但邑中人不惧怕，吉祥。" },
                { "position": 6, "content": "上六，比之无首，凶。结盟没有领导者，凶险。" }
            ]
        },
        "9": {
            "name": "小畜",
            "unicode": "\u4DC8",
            "binary": "110111",
            "explanation": "蓄养待进",
            "overview": "小畜为风天，象征小有所聚。小畜卦代表需要积累和逐渐发展的阶段。",
            "detail": "小畜卦由巽卦(风)上乾卦(天)下组成，象征着风行天上，小有畜积。小畜卦告诉我们，有时候我们需要逐步积累力量，而不是一蹴而就。就像蓄养牲畜需要时间和耐心一样，我们的事业和能力也需要逐渐培养和积累。小畜卦提醒我们，即使只有小的成就，也应该珍惜，因为它们是未来大成就的基础。'蓄养待进'教导我们要有耐心，等待合适的时机再大展拳脚。",
            "lines": [
                { "position": 1, "content": "初九，复自道，何其咎，吉。回归正道，没有过失，吉祥。" },
                { "position": 2, "content": "九二，牵复，吉。被牵引而回归正道，吉祥。" },
                { "position": 3, "content": "九三，舆说辐，夫妻反目。车轮脱落，夫妻反目，比喻行动受阻，人际关系紧张。" },
                { "position": 4, "content": "六四，有孚血去惕出，无咎。有诚信，消除忧虑，离开恐惧，没有灾祸。" },
                { "position": 5, "content": "九五，有孚挛如，富以其邻。以诚信团结他人，与邻里共享富足。" },
                { "position": 6, "content": "上九，既雨既处，尚德载，妇贞厉，月几望，君子征凶。雨过天晴，品德高尚者受到推崇，而妇女坚持固执则有危险，月接近圆满，君子远行有凶险。" }
            ]
        },
        "10": {
            "name": "履",
            "unicode": "\u4DC9",
            "binary": "111011",
            "explanation": "脚踏实地",
            "overview": "履为天泽，象征谨慎行走。履卦代表需要谨慎、礼仪和持正的阶段。",
            "detail": "履卦由乾卦(天)上兑卦(泽)下组成，象征着脚踏实地，小心谨慎地前行。履卦提醒我们在前进的过程中要注意自己的行为，遵守规则和礼仪。就像在危险的地方行走需要谨慎一样，在社会中也需要谨慎地与人交往，特别是与地位高的人。履卦的核心理念是'脚踏实地'，教导我们要实事求是，稳步前进，不要好高骛远。",
            "lines": [
                { "position": 1, "content": "初九，素履往，无咎。简朴行走，没有灾祸。" },
                { "position": 2, "content": "九二，履道坦坦，幽人贞吉。行走在平坦的道路上，隐居的人坚守正道，吉祥。" },
                { "position": 3, "content": "六三，眇能视，跛能履，履虎尾，咥人凶，武人为于大君。目力不佳的人也能看，腿脚不便的人也能走，但踩老虎尾巴会被咬伤，有凶险。武士为国王效力。" },
                { "position": 4, "content": "九四，履虎尾，愬愬终吉。踩老虎尾巴，虽然恐惧，最终吉祥。" },
                { "position": 5, "content": "九五，夬履，贞厉。果断前行，坚持正道，虽有危险。" },
                { "position": 6, "content": "上九，视履考祥，其旋元吉。审视自己的行为，返回本源，大吉大利。" }
            ]
        },
        "11": {
            "name": "泰",
            "unicode": "\u4DCA",
            "binary": "000111",
            "explanation": "应时而变",
            "overview": "泰为地天，象征通达与和谐。泰卦代表各方面都顺利发展的阶段。",
            "detail": "泰卦由坤卦(地)上乾卦(天)下组成，象征着天地交泰，阴阳调和，万物生长。泰卦是一个非常吉祥的卦象，代表着宇宙中的和谐状态。在这种状态下，上下关系融洽，小人退避，君子得位。泰卦提醒我们，顺利的时期不会永远持续，应当把握机会，积极行动。同时也要为将来可能的变化做好准备，不要安于现状而失去警惕。'应时而变'告诉我们要顺应时势，适时调整自己的策略。",
            "lines": [
                { "position": 1, "content": "初九，拔茅茹，以其汇，征吉。拔起茅草，连根带茎，比喻行动坚决顺利，征途吉祥。" },
                { "position": 2, "content": "九二，包荒，用冯河，不遐遗，朋亦无咎。能够包容荒芜，涉水渡河，不遗忘同伴，伙伴也无灾祸。" },
                { "position": 3, "content": "九三，无平不陂，无往不复，艰贞无咎。勿恤其孚，于食有福。没有永远平坦的道路，没有单向的行程，在艰难中坚守正道，没有灾祸。不必忧虑信用问题，饮食会有福分。" },
                { "position": 4, "content": "六四，翩翩不富，以其邻，不戒以孚。轻盈不自恃富有，与邻里相处，不设防而以诚信相待。" },
                { "position": 5, "content": "六五，帝乙归妹，以祉元吉。帝乙嫁女，大吉大利，象征贤者得位，万事亨通。" },
                { "position": 6, "content": "上六，城复于隍，勿用师，自邑告命，贞吝。城墙倒塌入城壕，不宜用兵，自己城中发布命令，会有困难。" }
            ]
        },
        "12": {
            "name": "否",
            "unicode": "\u4DCB",
            "binary": "111000",
            "explanation": "不交不通",
            "overview": "否为天地，象征闭塞与阻隔。否卦代表交流不畅、发展受阻的阶段。",
            "detail": "否卦由乾卦(天)上坤卦(地)下组成，象征天地不交，阴阳隔绝，万物难以生长。否卦是泰卦的反面，代表着不顺利、不通达的状态。在这种状态下，君子道长而小人道消，正义力量受到压制。否卦提醒我们，在逆境中要保持内心的澄明和正直，等待时机，而不是强行冲破障碍。'不交不通'形容的是外在环境的闭塞，但内心仍可保持光明和坚韧。",
            "lines": [
                { "position": 1, "content": "初六，拔茅茹，以其汇，贞吉亨。拔起茅草连根带茎，比喻行动坚决得当，坚守正道，吉祥通达。" },
                { "position": 2, "content": "六二，包承，小人吉，大人否亨。包容承担，小人吉祥，大人则不通达。" },
                { "position": 3, "content": "六三，包羞。怀抱羞耻。" },
                { "position": 4, "content": "九四，有命无咎，畴离祉。奉命行事没有灾祸，同伴分享福祉。" },
                { "position": 5, "content": "九五，休否，大人吉。否终也。停止不通，大人吉祥，这是否卦的终结。" },
                { "position": 6, "content": "上九，倾否，先否后喜。推翻闭塞状态，先有阻碍后有喜悦。" }
            ]
        },
        "13": {
            "name": "同人",
            "unicode": "\u4DCC",
            "binary": "111101",
            "explanation": "上下和同",
            "overview": "同人为天火，象征团结与和谐。同人卦代表人际关系融洽、团结合作的阶段。",
            "detail": "同人卦由乾卦(天)上离卦(火)下组成，象征着光明正大，志同道合。同人卦强调人与人之间的和谐关系和团结协作。在社会和家庭中，人们需要建立良好的关系，相互尊重，共同努力。同人卦提醒我们，真正的团结是建立在共同的理想和价值观基础上的，而不仅仅是表面的附和。'上下和同'教导我们在各种关系中都要追求和谐，但不要失去自己的独立性和原则。",
            "lines": [
                { "position": 1, "content": "初九，同人于门，无咎。在门口与人交往，没有灾祸。" },
                { "position": 2, "content": "六二，同人于宗，吝。在家族内部与人交往，可能有困难。" },
                { "position": 3, "content": "九三，伏战于莽，升其高陵，三岁不兴。埋伏在草丛中，登上高地，三年不行动，比喻谨慎防备。" },
                { "position": 4, "content": "九四，乘其墉，弗克攻，吉。登上城墙，但不进攻，吉祥。" },
                { "position": 5, "content": "九五，同人先号咷而后笑，大师克相遇。同人先哭后笑，大军能够相遇，象征转危为安。" },
                { "position": 6, "content": "上九，同人于郊，无悔。在郊外与人交往，没有后悔。" }
            ]
        },
        "14": {
            "name": "大有",
            "unicode": "\u4DCD",
            "binary": "101111",
            "explanation": "顺天依时",
            "overview": "大有为火天，象征丰盛与富足。大有卦代表事业兴旺、资源丰富的阶段。",
            "detail": "大有卦由离卦(火)上乾卦(天)下组成，象征着火在天上，光明普照，万物生长。大有卦是一个非常吉祥的卦象，代表着事业昌盛，财富丰盈的状态。在这种状态下，善人得到嘉奖，恶人受到惩罚，社会井然有序。大有卦提醒我们，在拥有资源和权力的时候，要保持谦虚和节制，不要滥用权力，而是要用来造福他人。'顺天依时'告诉我们要顺应自然规律，按照正确的时机行事。",
            "lines": [
                { "position": 1, "content": "初九，无交害，匪咎，艰则无咎。不与有害之人交往，没有灾祸，即使有困难也无灾祸。" },
                { "position": 2, "content": "九二，大车以载，有攸往，无咎。用大车装载，有所前往，没有灾祸。" },
                { "position": 3, "content": "九三，公用亨于天子，小人弗克。公爵享用天子的宴席，小人不能模仿，象征君子得位而小人退避。" },
                { "position": 4, "content": "九四，匪其彭，无咎。不张扬自己的富有，没有灾祸。" },
                { "position": 5, "content": "六五，厥孚交如，威如，吉。以诚信交友，有威严，吉祥。" },
                { "position": 6, "content": "上九，自天佑之，吉无不利。得到上天的保佑，吉祥没有不利。" }
            ]
        },
        "15": {
            "name": "谦",
            "unicode": "\u4DCE",
            "binary": "000100",
            "explanation": "内高外低",
            "overview": "谦为地山，象征谦逊与节制。谦卦代表需要谦虚、低调行事的阶段。",
            "detail": "谦卦由坤卦(地)上艮卦(山)下组成，象征山在地中，外表低下而内涵丰富。谦卦教导我们谦虚的重要性。谦虚不是自卑，而是一种明智的品格，能够赢得他人的尊重和支持。就像山虽然高大，但比起天空仍然显得低小一样，人无论多么成功，也应该保持谦逊的态度。谦卦的'内高外低'告诉我们，真正的谦虚是发自内心的，不是表面的伪装。",
            "lines": [
                { "position": 1, "content": "初六，谦谦君子，用涉大川，吉。谦虚的君子，可以渡过大河，吉祥。" },
                { "position": 2, "content": "六二，鸣谦，贞吉。表达谦虚，坚守正道，吉祥。" },
                { "position": 3, "content": "九三，劳谦君子，有终吉。勤劳而谦虚的君子，最终吉祥。" },
                { "position": 4, "content": "六四，无不利，撝谦。没有什么不利，宣扬谦德。" },
                { "position": 5, "content": "六五，不富以其邻，利用侵伐，无不利。不仅自己富足，也让邻居富足，适合征伐，没有不利。" },
                { "position": 6, "content": "上六，鸣谦，利用行师征邑国。宣扬谦德，适合率领军队征服敌国。" }
            ]
        },
        "16": {
            "name": "豫",
            "unicode": "\u4DCF",
            "binary": "001000",
            "explanation": "顺时依势",
            "overview": "豫为雷地，象征欢悦与预备。豫卦代表喜悦、享受和准备的阶段。",
            "detail": "豫卦由震卦(雷)上坤卦(地)下组成，象征着春雷响起，大地回春，万物欢欣。豫卦告诉我们，喜悦和享受是人生的自然部分，但要适度，不要沉迷其中。就像春天需要播种以备秋收一样，我们在享受当下的同时，也要为未来做好准备。豫卦的'顺时依势'提醒我们要顺应自然规律，把握适当的时机行动，不要违背自然的发展趋势。",
            "lines": [
                { "position": 1, "content": "初六，鸣豫，凶。喧闹的快乐，有凶险。" },
                { "position": 2, "content": "六二，介于石，不终日，贞吉。如同磐石一般坚固，不需等待很久，坚守正道，吉祥。" },
                { "position": 3, "content": "六三，盱豫，悔。迟疑不决的快乐，会有后悔。" },
                { "position": 4, "content": "九四，由豫，大有得，勿疑，朋盍簪。源自内心的快乐，会有大收获，不要怀疑，朋友们会聚集在一起。" },
                { "position": 5, "content": "六五，贞疾，恒不死。患病但坚守正道，虽长期患病但不会死亡。" },
                { "position": 6, "content": "上六，冥豫，成有渝，无咎。盲目追求快乐，会有变故，但无灾祸。" }
            ]
        },
        "17": {
            "name": "随",
            "unicode": "\u4DD0",
            "binary": "011001",
            "explanation": "随时变通",
            "overview": "随为泽雷，象征跟随与适应。随卦代表需要顺应形势、灵活调整的阶段。",
            "detail": "随卦由兑卦(泽)上震卦(雷)下组成，象征着相互顺从，灵活适应。随卦教导我们学会适应环境变化，根据形势调整自己的策略。就像水能够适应各种容器的形状一样，我们也需要有灵活性，能够随机应变。但是，随不是盲从，而是在坚持基本原则的前提下的灵活变通。随卦的'随时变通'提醒我们要把握时机，顺应潮流，但不失本心。",
            "lines": [
                { "position": 1, "content": "初九，官有渝，贞吉。出门交有功。官员有变动，坚守正道，吉祥。出门交友有功绩。" },
                { "position": 2, "content": "六二，系小子，失丈夫。紧跟小孩子，失去丈夫，比喻过于专注小事而忽略大局。" },
                { "position": 3, "content": "六三，系丈夫，失小子。随从成熟稳重的人，可能会失去年轻活力的人。" },
                { "position": 4, "content": "九四，随有获，贞凶。跟随他人而有所获，但如果固执己见会有凶险。" },
                { "position": 5, "content": "九五，孚于嘉，吉。诚信于美好的事物，吉祥。" },
                { "position": 6, "content": "上六，拘系之，乃从维之。利有攸往。被拘束后又被牵引，适合有所前往。" }
            ]
        },
        "18": {
            "name": "蛊",
            "unicode": "\u4DD1",
            "binary": "100110",
            "explanation": "振疲起衰",
            "overview": "蛊为山风，象征整治与更新。蛊卦代表需要整顿、改革和重新开始的阶段。",
            "detail": "蛊卦由艮卦(山)上巽卦(风)下组成，象征着山下起风，吹散沉积的污垢。蛊原意是器皿中生虫，引申为腐败或混乱的状态需要整治。蛊卦告诉我们，当事物陷入停滞或腐败时，需要振奋精神，进行改革和创新。这种整治不是简单的修补，而是要从根本上解决问题。蛊卦的'振疲起衰'鼓励我们不要对困难和衰败感到绝望，而是要有勇气去面对和改变。",
            "lines": [
                { "position": 1, "content": "初六，干父之蛊，有子考无咎，厉终吉。整治父亲留下的问题，有子能承担则无灾祸，虽有危险但终吉。" },
                { "position": 2, "content": "九二，干母之蛊，不可贞。整治母亲留下的问题，不可固执己见。" },
                { "position": 3, "content": "九三，干父之蛊，小有悔，无大咎。整治父亲留下的问题，有小悔恨，但没有大灾祸。" },
                { "position": 4, "content": "六四，裕父之蛊，往见吝。宽容父亲的过失，前行会有困难。" },
                { "position": 5, "content": "六五，干父之蛊，用誉。整治父亲留下的问题，会得到赞誉。" },
                { "position": 6, "content": "上九，不事王侯，高尚其事。不为王侯效力，追求高尚的事业。" }
            ]
        },
        "19": {
            "name": "临",
            "unicode": "\u4DD2",
            "binary": "000011",
            "explanation": "教民保民",
            "overview": "临为地泽，象征临近与监督。临卦代表需要监督、管理和指导的阶段。",
            "detail": "临卦由坤卦(地)上兑卦(泽)下组成，象征长官临近，监督工作。临卦教导我们如何正确地进行管理和领导。好的领导者不仅仅是发号施令，更重要的是以身作则，关心下属，为他们提供指导和帮助。临卦提醒我们，权力意味着责任，而不是特权。当我们处于领导地位时，应该公正、慈爱、有威严，这样才能赢得下属的尊重和支持。'教民保民'是临卦的核心，强调领导者的责任是教育和保护民众。",
            "lines": [
                { "position": 1, "content": "初九，咸临，贞吉。普遍的临近监督，坚守正道，吉祥。" },
                { "position": 2, "content": "九二，咸临，吉，无不利。普遍的临近监督，吉祥，没有不利。" },
                { "position": 3, "content": "六三，甘临，无攸利。往灾。不严肃的监督，没有好处，往前会有灾祸。" },
                { "position": 4, "content": "六四，至临，无咎。严肃认真的临近监督，没有灾祸。" },
                { "position": 5, "content": "六五，知临，大君之宜，吉。明智地监督，这是君主应该做的，吉祥。" },
                { "position": 6, "content": "上六，敦临，吉，无咎。敦厚地临近监督，吉祥，没有灾祸。" }
            ]
        },
        "20": {
            "name": "观",
            "unicode": "\u4DD3",
            "binary": "110000",
            "explanation": "观下瞻上",
            "overview": "观为风地，象征观察与审视。观卦代表需要观察、学习和反思的阶段。",
            "detail": "观卦由巽卦(风)上坤卦(地)下组成，象征风行地上，观察万物。观卦强调观察和理解的重要性。在做决定或采取行动之前，我们需要仔细观察情况，了解事物的本质。观卦也提醒我们，不仅要观察外部世界，也要观察自己内心的想法和感受，保持自我反省的习惯。观卦的'观下瞻上'教导我们既要关注具体细节，也要把握整体方向，两者缺一不可。",
            "lines": [
                { "position": 1, "content": "初六，童观，小人无咎，君子吝。儿童般的观察，小人没有灾祸，君子则有困难。" },
                { "position": 2, "content": "六二，窥观，利女贞。偷窥观察，对女子有利，象征内在的观察。" },
                { "position": 3, "content": "六三，观我生，进退。观察自己的行为，适时进退。" },
                { "position": 4, "content": "六四，观国之光，利用宾于王。观察国家的光明，适合做国王的宾客。" },
                { "position": 5, "content": "九五，观我生，君子无咎。观察自己的行为，君子没有灾祸。" },
                { "position": 6, "content": "上九，观其生，君子无咎。观察他人的行为，君子没有灾祸。" }
            ]
        },
        "21": {
            "name": "噬嗑",
            "unicode": "\u4DD4",
            "binary": "101001",
            "explanation": "刚柔相济",
            "overview": "噬嗑为火雷，象征决断与执行。噬嗑卦代表需要决断、惩恶扬善的阶段。",
            "detail": "噬嗑卦由离卦(火)上震卦(雷)下组成，象征着雷电交加，刚决果断。噬嗑原意是咬合，引申为决断、执行法律和惩罚罪恶。噬嗑卦告诉我们，社会需要法律和规则来维持秩序，对于违法犯罪的行为，需要坚决惩处。但同时，惩罚的目的是匡正错误，而不是报复，应当恰到好处，不过分也不不足。噬嗑卦的'刚柔相济'提醒我们在处理问题时要刚柔并济，既要有原则，也要有灵活性。",
            "lines": [
                { "position": 1, "content": "初九，屦校灭趾，无咎。脚被脚镣伤害，没有灾祸，比喻小惩大诫。" },
                { "position": 2, "content": "六二，噬肤灭鼻，无咎。咬破皮肤伤及鼻子，没有灾祸，比喻惩罚适度。" },
                { "position": 3, "content": "六三，噬腊肉，遇毒。小吝，无咎。咬干肉，遇到毒物，小困难，没有灾祸。" },
                { "position": 4, "content": "九四，噬干胏，得金矢，利艰贞，吉。咬坚硬的骨头，得到金箭，在艰难中坚守正道，吉祥。" },
                { "position": 5, "content": "六五，噬干肉，得黄金，贞厉，无咎。咬干肉，得到黄金，坚守正道虽有危险，没有灾祸。" },
                { "position": 6, "content": "上九，何校灭耳，凶。带上颈枷伤害耳朵，凶险，比喻过度惩罚。" }
            ]
        },
        "22": {
            "name": "贲",
            "unicode": "\u4DD5",
            "binary": "100101",
            "explanation": "饰外扬质",
            "overview": "贲为山火，象征装饰与美化。贲卦代表需要装饰、美化和提升外在形象的阶段。",
            "detail": "贲卦由艮卦(山)上离卦(火)下组成，象征着山上有火，光彩照人。贲原意是装饰美化，引申为文采和礼仪。贲卦告诉我们，适当的装饰和美化能够提升事物的价值和吸引力。但是，装饰应当适度，过度的装饰反而会掩盖事物的本质。贲卦提醒我们，外在的形式和内在的实质都很重要，两者应当和谐统一。'饰外扬质'教导我们在注重外表的同时，更要重视内在的品质和实力。",
            "lines": [
                { "position": 1, "content": "初九，贲其趾，舍车而徒。装饰脚趾，放弃车子而步行，比喻注重细节而忽略整体。" },
                { "position": 2, "content": "六二，贲其须。装饰胡须，比喻注重外表。" },
                { "position": 3, "content": "九三，贲如濡如，永贞吉。装饰得湿润鲜艳，长久坚守正道，吉祥。" },
                { "position": 4, "content": "六四，贲如皤如，白马翰如，匪寇婚媾。装饰得苍白，白马奔驰，不是强盗而是来求婚的。" },
                { "position": 5, "content": "六五，贲于丘园，束帛戋戋，吝，终吉。装饰山丘和园林，束帛虽少，有困难，但最终吉祥。" },
                { "position": 6, "content": "上九，白贲，无咎。素白的装饰，没有灾祸，比喻朴素无华的修饰。" }
            ]
        },
        "23": {
            "name": "剥",
            "unicode": "\u4DD6",
            "binary": "100000",
            "explanation": "顺势而止",
            "overview": "剥为山地，象征衰落与剥落。剥卦代表事物衰败、地位下降的阶段。",
            "detail": "剥卦由艮卦(山)上坤卦(地)下组成，象征着山崩地陷，万物凋零。剥原意是剥落，引申为衰败和消亡。剥卦告诉我们，万物有盛必有衰，这是自然规律。当我们面对衰败和困难时，不应该硬撑，而是要顺应时势，及时止损，等待新的机会。剥卦的'顺势而止'提醒我们，在逆境中要冷静面对，适时调整策略，而不是一味坚持。同时，剥卦也告诉我们，衰败之后往往蕴含着新生的希望。",
            "lines": [
                { "position": 1, "content": "初六，剥床以足，蔑贞凶。床被剥蚀从脚开始，不尊重正道，凶险。" },
                { "position": 2, "content": "六二，剥床以辨，蔑贞凶。床被剥蚀到边缘，不尊重正道，凶险。" },
                { "position": 3, "content": "六三，剥之，无咎。面对剥落，没有灾祸。" },
                { "position": 4, "content": "六四，剥床以肤，凶。床被剥蚀到皮肤，凶险。" },
                { "position": 5, "content": "六五，贯鱼，以宫人宠，无不利。一串鱼，受到宫人的宠爱，没有不利。" },
                { "position": 6, "content": "上九，硕果不食，君子得舆，小人剥庐。大果不吃，君子获得车子，小人失去住所。" }
            ]
        },
        "24": {
            "name": "复",
            "unicode": "\u4DD7",
            "binary": "000001",
            "explanation": "寓动于顺",
            "overview": "复为地雷，象征回归与复苏。复卦代表重新开始、东山再起的阶段。",
            "detail": "复卦由坤卦(地)上震卦(雷)下组成，象征着春雷始动，万物复苏。复原意是回归，引申为重新开始和恢复。复卦是剥卦的反面，代表经过衰败之后的新生和希望。复卦告诉我们，不要对挫折和失败感到绝望，因为新的机会总会到来。当我们重新开始时，应当从小事做起，脚踏实地，不要急于求成。复卦的'寓动于顺'教导我们，新的开始应当顺应自然规律，循序渐进，而不是急功近利。",
            "lines": [
                { "position": 1, "content": "初九，不远复，无祗悔，元吉。不远离就回返，没有太多后悔，大吉大利。" },
                { "position": 2, "content": "六二，休复，吉。安静地回返，吉祥。" },
                { "position": 3, "content": "六三，频复，厉无咎。频繁地回返，有危险但没有灾祸。" },
                { "position": 4, "content": "六四，中行独复。在中途独自回返。" },
                { "position": 5, "content": "六五，敦复，无悔。敦厚地回返，没有后悔。" },
                { "position": 6, "content": "上六，迷复，凶，有灾眚。用行师，终有大败，以其国君凶，至于十年不克征。迷失方向的回返，凶险，有灾难。如果出兵，最终会大败，对国君不利，十年不能征战。" }
            ]
        },
        "25": {
            "name": "无妄",
            "unicode": "\u4DD8",
            "binary": "111001",
            "explanation": "无妄而得",
            "overview": "无妄为天雷，象征真诚与自然。无妄卦代表真实、诚信和顺其自然的阶段。",
            "detail": "无妄卦由乾卦(天)上震卦(雷)下组成，象征着雷震天下，光明正大。无妄原意是没有虚妄，引申为真实、诚信和自然。无妄卦告诉我们，做人做事要真诚，不要有虚假和欺骗。同时，我们也应当顺应自然规律，不要过分强求，而是要根据实际情况，采取恰当的行动。无妄卦的'无妄而得'告诉我们，只有真诚和自然才能获得真正的成功和幸福。",
            "lines": [
                { "position": 1, "content": "初九，无妄往，吉。真诚地前行，吉祥。" },
                { "position": 2, "content": "六二，不耕获，不菑畲，则利有攸往。不耕种却有收获，不开荒却有良田，适合有所前往。" },
                { "position": 3, "content": "六三，无妄之灾，或系之牛，行人之得，邑人之灾。无端的灾祸，或被绑在牛上，行人得到好处，邑人遭受灾难。" },
                { "position": 4, "content": "九四，可贞，无咎。可以坚守正道，没有灾祸。" },
                { "position": 5, "content": "九五，无妄之疾，勿药有喜。无端的疾病，不用药物就会痊愈。" },
                { "position": 6, "content": "上九，无妄行，有眚，无攸利。妄为的行动，有灾祸，没有好处。" }
            ]
        },
        "26": {
            "name": "大畜",
            "unicode": "\u4DD9",
            "binary": "100111",
            "explanation": "止而不止",
            "overview": "大畜为山天，象征积蓄与蕴藏。大畜卦代表积累能量、储存资源的阶段。",
            "detail": "大畜卦由艮卦(山)上乾卦(天)下组成，象征着高山保留天之精气，积蓄能量。大畜原意是大的积蓄，引申为积累能量和蕴藏才能。大畜卦告诉我们，成功需要长期的积累和准备，不能急于求成。就像农民需要耐心等待庄稼生长一样，我们的事业和能力也需要时间来培养和发展。大畜卦的'止而不止'提醒我们，表面上的停滞可能是为了更好的发展，有时候退一步可以为将来的前进蓄积更多的力量。",
            "lines": [
                { "position": 1, "content": "初九，有厉，利已。有危险，适合停止。" },
                { "position": 2, "content": "九二，舆说辐。车轮脱落，比喻行动受阻。" },
                { "position": 3, "content": "九三，良马逐，利艰贞。君子图远，饮食不重节。良马奔驰，在艰难中坚守正道有利。君子考虑长远，不过分拘泥饮食礼节。" },
                { "position": 4, "content": "六四，童牛之牾，元吉。年幼的牛角刚长出来，大吉大利。" },
                { "position": 5, "content": "六五，豶豕之牙，吉。猪的獠牙，吉祥。" },
                { "position": 6, "content": "上九，何天之衢，亨。通达于天之道路，通达。" }
            ]
        },
        "27": {
            "name": "颐",
            "unicode": "\u4DDA",
            "binary": "100001",
            "explanation": "纯正以养",
            "overview": "颐为山雷，象征养育与滋养。颐卦代表需要养生、教育和培养的阶段。",
            "detail": "颐卦由艮卦(山)上震卦(雷)下组成，象征着山下有雷，滋养万物。颐原意是口腔，引申为养育和滋养。颐卦告诉我们，养育不仅仅指的是身体上的饮食，还包括心灵上的教育和修养。正如良好的饮食习惯对身体健康至关重要一样，正确的思想和价值观对心灵的发展也非常重要。颐卦的'纯正以养'提醒我们，在养育和教育过程中要遵循正道，不要被邪念所左右。",
            "lines": [
                { "position": 1, "content": "初九，舍尔灵龟，观我朵颐，凶。不理会神灵的乌龟，看着我的垂涎欲滴，凶险。" },
                { "position": 2, "content": "六二，颠颐，拂经，于丘颐，征凶。倒着吃东西，违背常理，在山上觅食，前行会有凶险。" },
                { "position": 3, "content": "六三，拂颐，贞凶，十年勿用，无攸利。违背饮食规律，坚持会有凶险，十年不可用，没有好处。" },
                { "position": 4, "content": "六四，颠颐，吉，虎视眈眈，其欲逐逐，无咎。倒着吃东西反而吉祥，像老虎那样盯着猎物，欲望迫切，没有灾祸。" },
                { "position": 5, "content": "六五，拂经，居贞吉，不可涉大川。违背常理，但安居守正道，吉祥，不适合渡过大河。" },
                { "position": 6, "content": "上九，由颐，厉吉，利涉大川。追求养生之道，虽有危险但吉祥，适合渡过大河。" }
            ]
        },
        "28": {
            "name": "大过",
            "unicode": "\u4DDB",
            "binary": "011110",
            "explanation": "非常行动",
            "overview": "大过为泽风，象征超越与非常。大过卦代表需要打破常规、采取非常措施的阶段。",
            "detail": "大过卦由兑卦(泽)上巽卦(风)下组成，象征着湖泊的水溢出，风吹树折。大过原意是严重超过，引申为非常规的状态和行动。大过卦告诉我们，在某些特殊情况下，常规的方法可能无法解决问题，需要采取非常规的措施。但是，这种非常规的行动应当是基于真实需要的，而不是为了标新立异。大过卦的'非常行动'提醒我们，在特殊情况下要有勇气打破常规，但也要保持理性，不要过度。",
            "lines": [
                { "position": 1, "content": "初六，藉用白茅，无咎。用白茅作垫子，没有灾祸，比喻谦虚谨慎。" },
                { "position": 2, "content": "九二，枯杨生稊，老夫得其女妻，无不利。枯萎的杨树长出新芽，老人娶到年轻的妻子，没有不利。" },
                { "position": 3, "content": "九三，栋桡，凶。栋梁弯曲，凶险。" },
                { "position": 4, "content": "九四，栋隆，吉，有它吝。栋梁隆起，吉祥，但有其他困难。" },
                { "position": 5, "content": "九五，枯杨生华，老妇得其士夫，无咎无誉。枯萎的杨树开花，老妇人得到年轻的丈夫，没有灾祸也没有赞誉。" },
                { "position": 6, "content": "上六，过涉灭顶，凶，无咎。渡河时水淹过头顶，凶险，但没有灾祸。" }
            ]
        },
        "29": {
            "name": "坎",
            "unicode": "\u4DDC",
            "binary": "010010",
            "explanation": "行险用险",
            "overview": "坎为水，象征危险与困境。坎卦代表面临危险、挑战和考验的阶段。",
            "detail": "坎卦由两个坎卦(水)重叠而成，象征着险境重重，危机四伏。坎原意是陷阱，引申为危险和困境。坎卦告诉我们，生活中的危险和困难是不可避免的，我们需要学会如何面对和克服它们。坎卦提醒我们，在危险面前要保持冷静和坚定，不要因为恐惧而失去判断力。有时候，危险也蕴含着机遇，只要我们能够正确应对，就能转危为安。坎卦的'行险用险'教导我们，在危险中要积极主动，利用危险而不是被危险所困。",
            "lines": [
                { "position": 1, "content": "初六，习坎，入于坎窞，凶。重复陷入险境，掉入深坑，凶险。" },
                { "position": 2, "content": "九二，坎有险，求小得。险境中有危险，获取小利。" },
                { "position": 3, "content": "六三，来之坎坎，险且枕，入于坎窞，勿用。来来往往都是险境，危险且重叠，掉入深坑，不可行动。" },
                { "position": 4, "content": "六四，樽酒簋贰，用缶，纳约自牖，终无咎。一樽酒，两簋食物，用陶器装，从窗户递进，最终没有灾祸。" },
                { "position": 5, "content": "九五，坎不盈，祗既平，无咎。深坑未满，已经平稳，没有灾祸。" },
                { "position": 6, "content": "上六，系用徽纆，寘于丛棘，三岁不得，凶。用绳索捆绑，置于荆棘丛中，三年不得脱离，凶险。" }
            ]
        },
        "30": {
            "name": "离",
            "unicode": "\u4DDD",
            "binary": "101101",
            "explanation": "附和依托",
            "overview": "离为火，象征光明与黏附。离卦代表明亮、依附和分离的阶段。",
            "detail": "离卦由两个离卦(火)重叠而成，象征着光明四射，照彻四方。离原意是黏附，也有分离的意思，引申为明亮和依附。离卦告诉我们，光明能够照亮黑暗，帮助我们看清事物的本质。但是，火虽然明亮，也有危险的一面，需要适当控制。离卦提醒我们，在追求光明和真相的过程中，要保持理性和平衡，不要被表面的光彩所迷惑。离卦的'附和依托'教导我们，人与人之间需要相互依靠，但也要保持适当的距离，避免过度依赖。",
            "lines": [
                { "position": 1, "content": "初九，履错然，敬之无咎。行走时出现失误，谨慎对待就没有灾祸。" },
                { "position": 2, "content": "六二，黄离，元吉。黄色的光明，大吉大利。" },
                { "position": 3, "content": "九三，日昃之离，不鼓缶而歌，则大耋之嗟，凶。太阳西斜的光明，不击缶而歌，就会有老年人的悲叹，凶险。" },
                { "position": 4, "content": "九四，突如其来如，焚如，死如，弃如。突然到来，如同火烧，如同死亡，如同被抛弃。" },
                { "position": 5, "content": "六五，出涕沱若，戚嗟若，吉。流泪满面，悲伤叹息，吉祥。" },
                { "position": 6, "content": "上九，王用出征，有嘉折首，获匪其丑，无咎。君王出征，有斩杀敌军首领的喜事，获得战利品，没有灾祸。" }
            ]
        },
        "31": {
            "name": "咸",
            "unicode": "\u4DDE",
            "binary": "011100",
            "explanation": "相互感应",
            "overview": "咸为泽山，象征感应与交流。咸卦代表相互吸引、交流和感情的阶段。",
            "detail": "咸卦由兑卦(泽)上艮卦(山)下组成，象征着泽润山而生情，男女相感。咸原意是感应，引申为交流和相互吸引。咸卦主要讲述的是人与人之间的感情和交流，特别是男女之间的情感。咸卦告诉我们，真正的感情是建立在相互尊重和理解基础上的，不仅仅是表面的吸引。咸卦的'相互感应'教导我们，在人际关系中要保持真诚和敏感，能够感受对方的情感和需求，这样才能建立深厚的感情。",
            "lines": [
                { "position": 1, "content": "初六，咸其拇。感应从脚拇指开始，象征感情的萌芽。" },
                { "position": 2, "content": "六二，咸其腓，凶，居吉。感应到小腿肚，有凶险，但安居可获吉祥。" },
                { "position": 3, "content": "九三，咸其股，执其随，往吝。感应到大腿，紧随其后，前往会有困难。" },
                { "position": 4, "content": "九四，贞吉，悔亡，憧憧往来，朋从尔思。坚守正道，吉祥，悔恨消失，往来不绝，朋友顺从你的想法。" },
                { "position": 5, "content": "九五，咸其脢，无悔。感应到脊背，没有后悔。" },
                { "position": 6, "content": "上六，咸其辅颊舌。感应到颊和舌，象征言语交流。" }
            ]
        },
        "32": {
            "name": "恒",
            "unicode": "\u4DDF",
            "binary": "001110",
            "explanation": "恒心有成",
            "overview": "恒为雷风，象征持久与恒定。恒卦代表需要持之以恒、稳定发展的阶段。",
            "detail": "恒卦由震卦(雷)上巽卦(风)下组成，象征着雷风相随，长久不息。恒原意是长久，引申为持续和稳定。恒卦告诉我们，成功往往需要长期的坚持和努力，不是一蹴而就的。就像自然界中的四季更替一样，事物的发展也有其固有的规律，我们需要顺应这种规律，持之以恒地努力。恒卦的'恒心有成'提醒我们，只有保持恒心和毅力，才能取得最终的成功。",
            "lines": [
                { "position": 1, "content": "初六，浚恒，贞凶，无攸利。刚开始就追求长久，坚持会有凶险，没有好处。" },
                { "position": 2, "content": "九二，悔亡。后悔消失。" },
                { "position": 3, "content": "九三，不恒其德，或承之羞，贞吝。不能持久地保持德行，或者会蒙受耻辱，坚持会有困难。" },
                { "position": 4, "content": "九四，田无禽。田猎没有收获，象征徒劳无功。" },
                { "position": 5, "content": "六五，恒其德，贞，妇人吉，夫子凶。持久地保持德行，坚守正道，对女子吉祥，对男子凶险。" },
                { "position": 6, "content": "上六，振恒，凶。动摇不定，凶险。" }
            ]
        },
        "33": {
            "name": "遁",
            "unicode": "\u4DE0",
            "binary": "111100",
            "explanation": "遁世救世",
            "overview": "遁为天山，象征退避与隐藏。遁卦代表需要暂时退让、保全实力的阶段。",
            "detail": "遁卦由乾卦(天)上艮卦(山)下组成，象征着天行健而山静止，日落西山。遁原意是逃避，引申为退却和隐藏。遁卦告诉我们，有时候退却不是懦弱，而是为了更好地保存实力，等待合适的时机再出发。就像冬天万物蛰伏一样，人有时也需要暂时隐藏锋芒，休养生息。遁卦的'遁世救世'教导我们，有时候退出世俗的喧嚣，反而能够更好地思考和准备，从而在将来更好地服务社会。",
            "lines": [
                { "position": 1, "content": "初六，遁尾，厉，勿用有攸往。逃跑时暴露尾巴，有危险，不宜有所前往。" },
                { "position": 2, "content": "六二，执之用黄牛之革，莫之胜说。用黄牛皮做的绳索捆绑，没有人能解开，象征牢固的约束。" },
                { "position": 3, "content": "九三，系遁，有疾厉，畜臣妾吉。退避受阻，有疾病和危险，蓄养奴仆吉祥。" },
                { "position": 4, "content": "九四，好遁，君子吉，小人否。喜欢退避，对君子吉祥，对小人不利。" },
                { "position": 5, "content": "九五，嘉遁，贞吉。优美的退避，坚守正道，吉祥。" },
                { "position": 6, "content": "上九，肥遁，无不利。丰满的退避，没有不利。" }
            ]
        },
        "34": {
            "name": "大壮",
            "unicode": "\u4DE1",
            "binary": "001111",
            "explanation": "壮勿妄动",
            "overview": "大壮为雷天，象征强大与刚健。大壮卦代表力量强盛、气势旺盛的阶段。",
            "detail": "大壮卦由震卦(雷)上乾卦(天)下组成，象征着雷霆万钧，威力强大。大壮原意是强健有力，引申为力量和势能。大壮卦告诉我们，当我们处于强盛状态时，要注意控制自己的力量，不要妄自行动。就像一个强壮的人如果不能控制自己的力量，反而容易造成伤害一样，强大的力量如果使用不当，也会带来灾难。大壮卦的'壮勿妄动'提醒我们，在强大时更要谨慎和自制，不要被力量冲昏头脑。",
            "lines": [
                { "position": 1, "content": "初九，壮于趾，征凶，有孚。脚趾变得强壮，前进会有凶险，要有诚信。" },
                { "position": 2, "content": "九二，贞吉。坚守正道，吉祥。" },
                { "position": 3, "content": "九三，小人用壮，君子用罔，贞厉。君子正往，君子休，吉。小人依靠力量，君子依靠谋略，坚持有危险。君子前行或止步，都吉祥。" },
                { "position": 4, "content": "九四，贞吉悔亡，藩决不羸，壮于大舆之輹。坚守正道，吉祥，悔恨消失，篱笆虽破但不衰弱，车轮的辐条变得强壮。" },
                { "position": 5, "content": "六五，丧羊于易，无悔。在交易中失去羊，没有后悔。" },
                { "position": 6, "content": "上六，羝羊触藩，不能退，不能遂，无攸利，艰则吉。公羊用角触篱笆，不能退后，不能前进，没有好处，但在艰难中可获吉祥。" }
            ]
        },
        "35": {
            "name": "晋",
            "unicode": "\u4DE2",
            "binary": "101000",
            "explanation": "求进发展",
            "overview": "晋为火地，象征进步与晋升。晋卦代表事业发展、地位提升的阶段。",
            "detail": "晋卦由离卦(火)上坤卦(地)下组成，象征着太阳从地平线上升起，光明普照。晋原意是前进，引申为晋升和发展。晋卦告诉我们，进步和发展需要循序渐进，不能操之过急。同时，晋升的过程中需要得到贵人的帮助和认可，也需要自己的努力和才华。晋卦的'求进发展'教导我们，在寻求进步的过程中，要保持谦虚和诚信，这样才能得到他人的支持和认可。",
            "lines": [
                { "position": 1, "content": "初六，晋如，摧如，贞吉。罔孚，裕无咎。前进时遇到挫折，坚守正道，吉祥。没有诚信，宽容没有灾祸。" },
                { "position": 2, "content": "六二，晋如，愁如，贞吉。受兹介福，于其王母。前进时遇到忧愁，坚守正道，吉祥。得到福分，来自于其王的配偶。" },
                { "position": 3, "content": "六三，众允，悔亡。众人赞同，悔恨消失。" },
                { "position": 4, "content": "九四，晋如鼫鼠，贞厉。前进如同鼯鼠，坚持有危险。" },
                { "position": 5, "content": "六五，悔亡，失得勿恤，往吉无不利。悔恨消失，失去或得到都不要忧虑，前往吉祥，没有不利。" },
                { "position": 6, "content": "上九，晋其角，维用伐邑，厉吉无咎，贞吝。用角进攻，适合攻打城邑，有危险但吉祥，没有灾祸，坚持会有困难。" }
            ]
        },
        "36": {
            "name": "明夷",
            "unicode": "\u4DE3",
            "binary": "000101",
            "explanation": "晦而转明",
            "overview": "明夷为地火，象征伤明与隐忍。明夷卦代表光明受损、需要隐忍的阶段。",
            "detail": "明夷卦由坤卦(地)上离卦(火)下组成，象征着光明陷入地下，暂时受到遮蔽。明夷原意是光明受伤，引申为隐忍和等待时机。明夷卦告诉我们，当处于逆境时，不要轻举妄动，而应当保持内心的光明和正直，等待时机的到来。就像太阳落入地下，并不意味着永远的黑暗，而是为了明天的升起做准备。明夷卦的'晦而转明'提醒我们，黑暗之后必有光明，在逆境中要保持希望和信心。",
            "lines": [
                { "position": 1, "content": "初九，明夷于飞，垂其翼。君子于行，三日不食，有攸往，主人有言。光明在飞行中受伤，垂下翅膀。君子在旅途中，三天不吃饭，有所前往，主人有话说。" },
                { "position": 2, "content": "六二，明夷，夷于左股，用拯马壮，吉。光明受伤，伤在左腿，用强壮的马来救助，吉祥。" },
                { "position": 3, "content": "九三，明夷于南狩，得其大首，不可疾贞。光明受伤，在南方打猎，得到大猎物，不宜急于求成。" },
                { "position": 4, "content": "六四，入于左腹，获明夷之心，出于门庭。进入左腹，了解明夷的心意，出于门庭。" },
                { "position": 5, "content": "六五，箕子之明夷，利贞。箕子式的明夷，坚守正道有利。" },
                { "position": 6, "content": "上六，不明晦，初登于天，后入于地。不明而晦暗，先升上天空，后落入地下。" }
            ]
        },
        "37": {
            "name": "家人",
            "unicode": "\u4DE4",
            "binary": "110101",
            "explanation": "诚威治业",
            "overview": "家人为风火，象征家庭与和谐。家人卦代表家庭和睦、家族兴旺的阶段。",
            "detail": "家人卦由巽卦(风)上离卦(火)下组成，象征着风吹火旺，家庭和谐。家人原意是家庭成员，引申为家庭管理和家族和谐。家人卦告诉我们，家庭是社会的基本单位，家庭的和谐与稳定对个人的发展和社会的稳定都有重要意义。家人卦提醒我们，在家庭中要明确各自的角色和职责，互相尊重和支持。家人卦的'诚威治业'教导我们，管理家庭需要诚信和威严，治理事业需要勤劳和智慧。",
            "lines": [
                { "position": 1, "content": "初九，闲有家，悔亡。治家有规矩，悔恨消失。" },
                { "position": 2, "content": "六二，无攸遂，在中馈，贞吉。没有追求外部事业，专注于家务，坚守正道，吉祥。" },
                { "position": 3, "content": "九三，家人嗃嗃，悔厉吉，妇子嘻嘻，终吝。家人严厉，虽有悔恨但最终吉祥，妇女和孩子嬉笑，最终会有困难。" },
                { "position": 4, "content": "六四，富家，大吉。家庭富足，大吉大利。" },
                { "position": 5, "content": "九五，王假有家，勿恤吉。君王治理家国，不必忧虑，吉祥。" },
                { "position": 6, "content": "上九，有孚威如，终吉。有诚信和威严，最终吉祥。" }
            ]
        },
        "38": {
            "name": "睽",
            "unicode": "\u4DE5",
            "binary": "101011",
            "explanation": "异中求同",
            "overview": "睽为火泽，象征违背与背离。睽卦代表不和、对立和矛盾的阶段。",
            "detail": "睽卦由离卦(火)上兑卦(泽)下组成，象征着火在上而水在下，两者相违背。睽原意是乖违，引申为对立和不和。睽卦告诉我们，人与人之间的不和和矛盾是难以避免的，但我们应当寻求解决这些矛盾的方法，而不是任其发展。睽卦提醒我们，即使在对立和不和的情况下，也要保持善意和理性，寻求共同点。睽卦的'异中求同'教导我们，在差异和对立中寻找一致点，才能化解矛盾，实现和解。",
            "lines": [
                { "position": 1, "content": "初九，悔亡，丧马勿逐，自复，见恶人无咎。悔恨消失，失去马不要追赶，自然会回来，遇到恶人无灾祸。" },
                { "position": 2, "content": "九二，遇主于巷，无咎。在小巷中遇到主人，没有灾祸。" },
                { "position": 3, "content": "六三，见舆曳，其牛掣，其人天且劓，无初有终。看见车子被拖拉，牛被牵制，人被刺额割鼻，开始不佳但结果较好。" },
                { "position": 4, "content": "九四，睽孤，遇元夫，交孚，厉无咎。孤独的乖违，遇到重要人物，相互信任，虽有危险但无灾祸。" },
                { "position": 5, "content": "六五，悔亡，厥宗噬肤，往何咎。悔恨消失，同族人咬破皮肤，前往有什么灾祸呢？" },
                { "position": 6, "content": "上九，睽孤，见豕负涂，载鬼一车，先张之弧，后说之弧，匪寇婚媾，往遇雨则吉。孤独的乖违，看见猪背着泥，车上载着鬼，先拉弓后放松，不是强盗而是来求婚的，前往遇雨则吉祥。" }
            ]
        },
        "39": {
            "name": "蹇",
            "unicode": "\u4DE6",
            "binary": "010100",
            "explanation": "险阻在前",
            "overview": "蹇为水山，象征跛足与艰难。蹇卦代表前进受阻、困难重重的阶段。",
            "detail": "蹇卦由坎卦(水)上艮卦(山)下组成，象征着山前有水，步履维艰。蹇原意是跛足，引申为行动不便和困难重重。蹇卦告诉我们，人生路上会遇到各种障碍和困难，有时候前进是非常艰难的。在这种情况下，不应该硬闯，而是要审时度势，找到合适的方法绕过障碍。蹇卦提醒我们，在困难面前要保持耐心和智慧，不要因为一时的挫折而放弃目标。蹇卦的'险阻在前'教导我们，在前进道路上遇到障碍时，需要谨慎应对，不可贸然行动。",
            "lines": [
                { "position": 1, "content": "初六，往蹇，来誉。前往会遇到困难，返回会受到称赞。" },
                { "position": 2, "content": "六二，王臣蹇蹇，匪躬之故。王的臣子步履艰难，不是自己的原因。" },
                { "position": 3, "content": "九三，往蹇，来反。前往遇到困难，返回。" },
                { "position": 4, "content": "六四，往蹇，来连。前往遇到困难，返回时遇到连续的麻烦。" },
                { "position": 5, "content": "九五，大蹇，朋来。大的困难，朋友来帮助。" },
                { "position": 6, "content": "上六，往蹇，来硕，吉，利见大人。前往遇到困难，返回丰硕，吉祥，适合见大人。" }
            ]
        },
        "40": {
            "name": "解",
            "unicode": "\u4DE7",
            "binary": "001010",
            "explanation": "柔道致治",
            "overview": "解为雷水，象征解除与化解。解卦代表摆脱困境、解决问题的阶段。",
            "detail": "解卦由震卦(雷)上坎卦(水)下组成，象征着雷雨降临，解除干旱。解原意是解开，引申为解除、解决和释放。解卦是蹇卦的相反，代表困难过后的解脱和释放。解卦告诉我们，任何困难和问题最终都会得到解决，关键是我们要采取正确的方法。解卦提醒我们，解决问题不一定需要强硬的手段，有时候柔软的方式反而更有效。解卦的'柔道致治'教导我们，用柔和的方法可以达到治理的目的，刚强的力量不一定能解决所有问题。",
            "lines": [
                { "position": 1, "content": "初六，无咎。没有灾祸。" },
                { "position": 2, "content": "九二，田获三狐，得黄矢，贞吉。田猎获得三只狐狸，得到黄色的箭，坚守正道，吉祥。" },
                { "position": 3, "content": "六三，负且乘，致寇至，贞吝。背负行李却乘车，招来敌人，坚持会有困难。" },
                { "position": 4, "content": "九四，解而拇，朋至斯孚。解除脚大拇指的疾病，朋友到来并信任。" },
                { "position": 5, "content": "六五，君子维有解，吉，有孚于小人。君子有所解除，吉祥，对小人要有诚信。" },
                { "position": 6, "content": "上六，公用射隼于高墉之上，获之，无不利。公爵用箭射高墙上的隼鹰，射中了，没有不利。" }
            ]
        },
        "41": {
            "name": "损",
            "unicode": "\u4DE8",
            "binary": "100011",
            "explanation": "损益制衡",
            "overview": "损为山泽，象征减损与牺牲。损卦代表需要减少、克制和牺牲的阶段。",
            "detail": "损卦由艮卦(山)上兑卦(泽)下组成，象征泽水减损山体，减少上面而增益下面。损原意是减少，引申为克制和牺牲。损卦告诉我们，有时候为了达到更大的目标，需要牺牲眼前的利益；有时候为了整体的利益，个人需要有所克制和让步。损卦提醒我们，适当的减损实际上是为了更好的发展，就像修剪树木是为了让它长得更好一样。损卦的'损益制衡'教导我们，在生活中要懂得取舍，有所减必有所增，保持平衡才能健康发展。",
            "lines": [
                { "position": 1, "content": "初九，已事遄往，无咎，酌损之。有事快速前往，没有灾祸，斟酌而减损。" },
                { "position": 2, "content": "九二，利贞，征凶，弗损益之。有利于坚守正道，前进有凶险，不要减损而要增益。" },
                { "position": 3, "content": "六三，三人行，则损一人；一人行，则得其友。三个人同行，就会损失一个人；一个人行走，就会得到伙伴。" },
                { "position": 4, "content": "六四，损其疾，使遄有喜，无咎。减轻疾病，使快速有喜悦，没有灾祸。" },
                { "position": 5, "content": "六五，或益之，十朋之龟弗克违，元吉。有人增益他，价值十贝的龟甲不能违背，大吉大利。" },
                { "position": 6, "content": "上九，弗损益之，无咎，贞吉，利有攸往，得臣无家。不减损而增益，没有灾祸，坚守正道，吉祥，适合有所前往，得到臣子而没有家属。" }
            ]
        },
        "42": {
            "name": "益",
            "unicode": "\u4DE9",
            "binary": "110001",
            "explanation": "损上益下",
            "overview": "益为风雷，象征增益与发展。益卦代表事物增长、发展和改善的阶段。",
            "detail": "益卦由巽卦(风)上震卦(雷)下组成，象征风雷激荡，万物生长。益原意是增加，引申为发展和进步。益卦是损卦的相反，代表增加和发展的状态。益卦告诉我们，增益和发展是需要正确方向的，最好的增益是减少上面而增加下面，也就是减少富有的而增加贫穷的，这样才能实现社会的平衡和和谐。益卦提醒我们，真正的增益不是一味的积累和获取，而是懂得分享和付出。益卦的'损上益下'教导我们，领导者应当减少自己的利益而增加下属的福祉，这样才能获得真正的尊重和支持。",
            "lines": [
                { "position": 1, "content": "初九，利用为大作，元吉，无咎。有利于做大事，大吉大利，没有灾祸。" },
                { "position": 2, "content": "六二，或益之，十朋之龟弗克违，永贞吉。或有人增益，价值十贝的龟甲不能违背，长期坚守正道，吉祥。" },
                { "position": 3, "content": "六三，益之用凶事，无咎。以忧则吉。增益用于凶险的事情，没有灾祸。以忧虑的态度处理，吉祥。" },
                { "position": 4, "content": "六四，中行，告公从，利用为依迁国。在中间行走，告诉公爵并跟从，有利于依靠别人迁徙国家。" },
                { "position": 5, "content": "九五，有孚惠心，勿问元吉。利用惠，于不易方。有诚信和仁慈之心，不必询问，大吉大利。有利于施行仁惠，不改变方向。" },
                { "position": 6, "content": "上九，莫益之，或击之，立心勿恒，凶。没有人增益他，或者有人攻击他，立下的心意不能持久，凶险。" }
            ]
        },
        "43": {
            "name": "夬",
            "unicode": "\u4DEA",
            "binary": "011111",
            "explanation": "决而能和",
            "overview": "夬为泽天，象征决断与果决。夬卦代表需要果断决策、坚决行动的阶段。",
            "detail": "夬卦由兑卦(泽)上乾卦(天)下组成，象征泽水决堤，泄流天下。夬原意是决断，引申为果决和坚定。夬卦告诉我们，当面对邪恶势力或不正当行为时，需要坚决地予以制止和清除。但是，在决断的过程中也要保持中正和柔和，不可过于刚猛而伤害无辜。夬卦提醒我们，决断不是为了发泄情绪，而是为了匡正错误，维护正义。夬卦的'决而能和'教导我们，即使在坚决行动的时候，也要保持内心的平和，不要被愤怒和仇恨所控制。",
            "lines": [
                { "position": 1, "content": "初九，壮于前趾，往不胜为咎。前趾变得强壮，前进而不能胜利，有灾祸。" },
                { "position": 2, "content": "九二，惕号，莫夜有戎，勿恤。警惕地呼喊，不要晚上有军事行动，不必忧虑。" },
                { "position": 3, "content": "九三，壮于頄，有凶。君子夬夬，独行遇雨，若濡有愠，无咎。颧骨变得强壮，有凶险。君子决断坚决，独行遇雨，被淋湿而生气，没有灾祸。" },
                { "position": 4, "content": "九四，臀无肤，其行次且。载鬼一车，取厉，有言。臀部没有皮肤，行走困难。载鬼一车，取得险厉，有言论。" },
                { "position": 5, "content": "九五，苋陆夬夬，中行无咎。苋菜和陆草坚决茁壮，在中间行走，没有灾祸。" },
                { "position": 6, "content": "上六，无号，终有凶。没有呼喊，最终有凶险。" }
            ]
        },
        "44": {
            "name": "姤",
            "unicode": "\u4DEB",
            "binary": "111110",
            "explanation": "天下有风",
            "overview": "姤为天风，象征偶遇与不期而遇。姤卦代表意外相遇、偶然邂逅的阶段。",
            "detail": "姤卦由乾卦(天)上巽卦(风)下组成，象征天下有风，吹拂万物。姤原意是偶遇，引申为相遇和结合。姤卦是夬卦的相反，代表阴气初生，开始影响阳气的状态。姤卦告诉我们，人生中的相遇往往是偶然的，但也蕴含着必然性。我们要珍惜这些相遇，无论是与人还是与机会的相遇，都可能改变我们的人生轨迹。姤卦的'天下有风'提醒我们，就像风吹拂大地一样，人际关系的建立也需要主动出击，不能被动等待。",
            "lines": [
                { "position": 1, "content": "初六，系于金柅，贞吉，有攸往，见凶，羸豕踟躅。系在金属马扭上，坚守正道，吉祥，有所前往，遇到凶险，瘦弱的猪踟蹰不前。" },
                { "position": 2, "content": "九二，包有鱼，无咎，不利宾。袋子里有鱼，没有灾祸，不利于宴请宾客。" },
                { "position": 3, "content": "九三，臀无肤，其行次且，厉，无大咎。臀部没有皮肤，行走困难，有危险，但没有大灾祸。" },
                { "position": 4, "content": "九四，包无鱼，起凶。袋子里没有鱼，引起凶险。" },
                { "position": 5, "content": "九五，以杞包瓜，含章，有陨自天。用杞树条包裹瓜，含有光彩，有物从天而降。" },
                { "position": 6, "content": "上九，姤其角，吝，无咎。相遇到它的角，有困难，没有灾祸。" }
            ]
        },
        "45": {
            "name": "萃",
            "unicode": "\u4DEC",
            "binary": "011000",
            "explanation": "荟萃聚集",
            "overview": "萃为泽地，象征聚集与会合。萃卦代表人员聚集、力量汇聚的阶段。",
            "detail": "萃卦由兑卦(泽)上坤卦(地)下组成，象征泽水积于地上，万物荟萃。萃原意是聚集，引申为集合和汇集。萃卦告诉我们，人与人之间的聚集和合作是实现大事业的基础。但是，聚集需要有共同的目标和价值观，否则难以长久。萃卦提醒我们，在聚集和合作的过程中，需要明确的领导和规则，这样才能保持团队的稳定和高效。萃卦的'荟萃聚集'教导我们，团结一致，聚集力量，是成就大业的关键。",
            "lines": [
                { "position": 1, "content": "初六，有孚不终，乃乱乃萃，若号，一握为笑，勿恤，往无咎。有诚信但不能持久，先混乱后聚集，有如呼喊，一握之数就变为笑声，不必忧虑，前往没有灾祸。" },
                { "position": 2, "content": "六二，引吉，无咎，孚乃利用禴。被引导，吉祥，没有灾祸，诚信则有利于祭祀。" },
                { "position": 3, "content": "六三，萃如，嗟如，无攸利，往无咎，小吝。聚集而叹息，没有好处，前往没有灾祸，小有困难。" },
                { "position": 4, "content": "九四，大吉，无咎。大吉大利，没有灾祸。" },
                { "position": 5, "content": "九五，萃有位，无咎。匪孚，元永贞，悔亡。聚集而有位置，没有灾祸。不是因为诚信，而是因为长期坚守正道，悔恨消失。" },
                { "position": 6, "content": "上六，赍咨涕洟，无咎。叹息流泪，没有灾祸。" }
            ]
        },
        "46": {
            "name": "升",
            "unicode": "\u4DED",
            "binary": "000110",
            "explanation": "柔顺谦虚",
            "overview": "升为地风，象征上升与提升。升卦代表上进、提升和发展的阶段。",
            "detail": "升卦由坤卦(地)上巽卦(风)下组成，象征风行地上，万物生长向上。升原意是上升，引申为提升和发展。升卦告诉我们，上升和发展是一个循序渐进的过程，需要脚踏实地，一步一步来。同时，上升也需要得到上级的认可和支持，需要有适当的方法和策略。升卦提醒我们，上升的过程中要保持谦虚和柔顺的态度，不要因为一时的成功而变得骄傲。升卦的'柔顺谦虚'教导我们，真正的上升不是强行攀爬，而是通过自身的价值和贡献得到认可和提升。",
            "lines": [
                { "position": 1, "content": "初六，允升，大吉。诚实地上升，大吉大利。" },
                { "position": 2, "content": "九二，孚乃利用禴，无咎。诚信则有利于祭祀，没有灾祸。" },
                { "position": 3, "content": "九三，升虚邑。上升到空虚的城邑。" },
                { "position": 4, "content": "六四，王用亨于岐山，吉，无咎。君王在岐山祭祀，吉祥，没有灾祸。" },
                { "position": 5, "content": "六五，贞吉，升阶。坚守正道，吉祥，登上台阶。" },
                { "position": 6, "content": "上六，冥升，利于不息之贞。在黑暗中上升，有利于不停息的正道。" }
            ]
        },
        "47": {
            "name": "困",
            "unicode": "\u4DEE",
            "binary": "011010",
            "explanation": "困境求通",
            "overview": "困为泽水，象征困境与窘迫。困卦代表处于困境、受到束缚的阶段。",
            "detail": "困卦由兑卦(泽)上坎卦(水)下组成，象征泽水干涸，困于泥泞。困原意是困境，引申为艰难和束缚。困卦告诉我们，人生中难免会遇到各种困境和束缚，这是正常的现象。在困境中，不要怨天尤人，而应该反思自己，寻找解决问题的方法。困卦提醒我们，困境往往是暂时的，只要保持坚韧的意志和积极的态度，终会柳暗花明。困卦的'困境求通'教导我们，在困境中要寻求突破和出路，不要被现状所束缚。",
            "lines": [
                { "position": 1, "content": "初六，臀困于株木，入于幽谷，三岁不觌。臀部被树木困住，进入幽深的山谷，三年不见天日。" },
                { "position": 2, "content": "九二，困于酒食，朱绂方来，利用亨祀，征凶，无咎。被酒食所困，身着朱色绶带的使者前来，有利于祭祀，出征有凶险，没有灾祸。" },
                { "position": 3, "content": "六三，困于石，据于蒺藜，入于其宫，不见其妻，凶。被石头所困，倚靠在蒺藜上，进入自己的宫室，看不见妻子，凶险。" },
                { "position": 4, "content": "九四，来徐徐，困于金车，吝，有终。缓慢地前来，被华丽的车子所困，有困难，但有结果。" },
                { "position": 5, "content": "九五，劓刖，困于赤绂，乃徐有说，利用祭祀。被割鼻砍足，被红色绶带所困，慢慢地得到解释，有利于祭祀。" },
                { "position": 6, "content": "上六，困于葛藟，于臲卼，曰动悔。有悔亡。被葛藤缠住，处于危险的边缘，说动则后悔。有悔恨但会消失。" }
            ]
        },
        "48": {
            "name": "井",
            "unicode": "\u4DEF",
            "binary": "010110",
            "explanation": "求贤若渴",
            "overview": "井为水风，象征滋养与供给。井卦代表持续供应、稳定滋养的阶段。",
            "detail": "井卦由坎卦(水)上巽卦(风)下组成，象征木桶打水上来，风吹水面。井原意是水井，引申为供给和滋养。井卦告诉我们，就像水井能够持续不断地供给水源一样，我们也应当建立可持续发展的体系，为社会提供稳定的服务和价值。井卦提醒我们，无论社会如何变化，人们对于基本需求的渴望是不变的，我们应当专注于满足这些基本需求。井卦的'求贤若渴'教导我们，对于优秀人才的渴求应当像对水源的渴求一样迫切，因为人才是发展的关键。",
            "lines": [
                { "position": 1, "content": "初六，井泥不食，旧井无禽。井底有泥，不可饮食，旧井没有禽兽，象征荒废。" },
                { "position": 2, "content": "九二，井谷射鲋，瓮敝漏。井谷中射杀小鱼，水瓮破旧漏水，象征资源浪费。" },
                { "position": 3, "content": "九三，井渫不食，为我心恻，可用汲，王明，并受其福。井水清澈却不饮用，使我心痛，可以汲取，君王明察，共同接受福分。" },
                { "position": 4, "content": "六四，井甃，无咎。井壁修砌，没有灾祸。" },
                { "position": 5, "content": "九五，井冽，寒泉食。井水清冽，取冷泉饮用。" },
                { "position": 6, "content": "上六，井收勿幕，有孚元吉。井水取尽不要遮掩，有诚信，大吉大利。" }
            ]
        },
        "49": {
            "name": "革",
            "unicode": "\u4DF0",
            "binary": "011101",
            "explanation": "顺天应人",
            "overview": "革为泽火，象征变革与革新。革卦代表变革、改革和创新的阶段。",
            "detail": "革卦由兑卦(泽)上离卦(火)下组成，象征革除旧的，迎接新的。革原意是兽皮，引申为改变和革新。革卦告诉我们，万物都在不断地变化和发展，有时候需要进行彻底的变革，才能适应新的环境和要求。但是，革新并不是随意的变动，而是应当顺应天道，符合人心。革卦提醒我们，在进行变革时，要有明确的目标和计划，不要盲目跟风。革卦的'顺天应人'教导我们，真正有效的革新是顺应自然规律，符合人民意愿的。",
            "lines": [
                { "position": 1, "content": "初九，巩用黄牛之革。用黄牛皮做的结实带子，象征稳固的变革基础。" },
                { "position": 2, "content": "六二，巳日乃革之，征吉，无咎。到了巳日才进行变革，前进吉祥，没有灾祸。" },
                { "position": 3, "content": "九三，征凶，贞厉，革言三就，有孚。前进有凶险，坚持有危险，变革言论三次才成功，有诚信。" },
                { "position": 4, "content": "九四，悔亡，有孚改命，吉。悔恨消失，有诚信改变命运，吉祥。" },
                { "position": 5, "content": "九五，大人虎变，未占有孚。大人如虎般变化，不需卜问，有诚信。" },
                { "position": 6, "content": "上六，君子豹变，小人革面，征凶，居贞吉。君子如豹般变化，小人只改变表面，前进有凶险，安居坚守正道，吉祥。" }
            ]
        },
        "50": {
            "name": "鼎",
            "unicode": "\u4DF1",
            "binary": "101110",
            "explanation": "稳重图变",
            "overview": "鼎为火风，象征鼎新与革故。鼎卦代表变革、创新和转变的阶段。",
            "detail": "鼎卦由离卦(火)上巽卦(风)下组成，象征风吹火旺，鼎烹万物。鼎原意是古代的炊具，引申为权力和变革。鼎卦是革卦的相反，也代表变革，但更强调在变革中保持稳定和传承。鼎卦告诉我们，变革不是推倒重来，而是在保留精华的基础上去除糟粕，创造新的价值。鼎卦提醒我们，掌握权力者应当用权力为人民服务，而不是谋取私利。鼎卦的'稳重图变'教导我们，在追求变革的同时，要保持稳重和谨慎，不要急于求成。",
            "lines": [
                { "position": 1, "content": "初六，鼎颠趾，利出否，得妾以其子，无咎。鼎翻倒，脚朝上，有利于倒出不好的东西，得到侍妾和她的儿子，没有灾祸。" },
                { "position": 2, "content": "九二，鼎有实，我仇有疾，不我能即，吉。鼎中有食物，我的敌人有疾病，不能靠近我，吉祥。" },
                { "position": 3, "content": "九三，鼎耳革，其行塞，雉膏不食，方雨亏悔，终吉。鼎的耳朵被改变，行动受阻，不能食用山鸡的油脂，遇到雨会减少悔恨，最终吉祥。" },
                { "position": 4, "content": "九四，鼎折足，覆公餗，其形渥，凶。鼎的腿断了，倾覆君王的美食，形状污秽，凶险。" },
                { "position": 5, "content": "六五，鼎黄耳，金铉，利贞。鼎有黄色的耳朵，黄金的提环，有利于坚守正道。" },
                { "position": 6, "content": "上九，鼎玉铉，大吉，无不利。鼎有玉石的提环，大吉大利，没有不利。" }
            ]
        },
        "51": {
            "name": "震",
            "unicode": "\u4DF2",
            "binary": "001001",
            "explanation": "临危不乱",
            "overview": "震为雷，象征震动与惊醒。震卦代表突变、惊恐和觉醒的阶段。",
            "detail": "震卦由两个震卦(雷)重叠而成，象征着雷声阵阵，令人震惊。震原意是雷声，引申为震动和警醒。震卦告诉我们，突然的变化和惊吓是生活中难以避免的，我们需要学会应对这些突发事件。震卦提醒我们，在面对危险和惊恐时，要保持冷静和理智，不要惊慌失措。有时候，震惊也是一种警醒，能够唤醒我们的意识，促使我们进行反思和改变。震卦的'临危不乱'教导我们，在危险面前保持镇定，才能找到解决问题的方法。",
            "lines": [
                { "position": 1, "content": "初九，震来虩虩，后笑言哑哑，吉。雷声隆隆震来，后面笑语喧哗，吉祥。" },
                { "position": 2, "content": "六二，震来厉，亿丧贝，跻于九陵，勿逐，七日得。雷声震来，有危险，亿万丧失贝货，攀登九座高陵，不要追逐，七天后得到。" },
                { "position": 3, "content": "六三，震苏苏，震行无眚。雷声不断，震动前行没有灾难。" },
                { "position": 4, "content": "九四，震遂泥。雷声使人陷入泥中。" },
                { "position": 5, "content": "六五，震往来厉，亿无丧，有事。雷声往来有危险，亿万没有损失，有事情。" },
                { "position": 6, "content": "上六，震索索，视矍矍，征凶。震未损，有言，终吉。雷声索索，看起来惊恐不安，前进有凶险。雷声没有造成损害，有言论，最终吉祥。" }
            ]
        },
        "52": {
            "name": "艮",
            "unicode": "\u4DF3",
            "binary": "100100",
            "explanation": "动静适时",
            "overview": "艮为山，象征止步与稳定。艮卦代表停止、安静和稳定的阶段。",
            "detail": "艮卦由两个艮卦(山)重叠而成，象征着高山巍峨，稳如泰山。艮原意是停止，引申为静止和稳定。艮卦告诉我们，在适当的时候停下来，是为了更好地前进。就像登山时需要休息一样，人生的旅途中也需要有停下来思考和调整的时刻。艮卦提醒我们，不要一味地追求前进和变化，有时候保持稳定和安静也是一种智慧。艮卦的'动静适时'教导我们，动与静要根据时机和情况来选择，不可一成不变。",
            "lines": [
                { "position": 1, "content": "初六，艮其趾，无咎，利永贞。停止脚步，没有灾祸，有利于长期坚守正道。" },
                { "position": 2, "content": "六二，艮其腓，不拯其随，其心不快。停止小腿，不能救助追随者，心中不快。" },
                { "position": 3, "content": "九三，艮其限，列其夤，厉熏心。停止腰部，压迫脊椎，危险灼心。" },
                { "position": 4, "content": "六四，艮其身，无咎。停止身体，没有灾祸。" },
                { "position": 5, "content": "六五，艮其辅，言有序，悔亡。停止说话，言论有条理，悔恨消失。" },
                { "position": 6, "content": "上九，敦艮，吉。敦厚地停止，吉祥。" }
            ]
        },
        "53": {
            "name": "渐",
            "unicode": "\u4DF4",
            "binary": "110100",
            "explanation": "渐进蓄德",
            "overview": "渐为风山，象征渐进与发展。渐卦代表循序渐进、稳步发展的阶段。",
            "detail": "渐卦由巽卦(风)上艮卦(山)下组成，象征大雁飞到山上，逐渐前进。渐原意是慢慢前进，引申为发展和进步。渐卦告诉我们，真正的发展是一个渐进的过程，需要按部就班，不能急于求成。就像大雁南飞需要一步一步地前进一样，我们的事业和人生也需要一步一步地积累和发展。渐卦提醒我们，渐进的过程中要注重道德的培养和知识的积累，这样才能为未来的发展打下坚实的基础。渐卦的'渐进蓄德'教导我们，在前进的过程中要积累德行和能力，而不仅仅是追求表面的成功。",
            "lines": [
                { "position": 1, "content": "初六，鸿渐于干，小子厉，有言，无咎。大雁渐进于岸边，小子有危险，有言论，没有灾祸。" },
                { "position": 2, "content": "六二，鸿渐于磐，饮食衎衎，吉。大雁渐进于磐石，饮食欢乐，吉祥。" },
                { "position": 3, "content": "九三，鸿渐于陆，夫征不复，妇孕不育，凶，利御寇。大雁渐进于陆地，丈夫出征不返，妻子怀孕不育，凶险，有利于防御敌寇。" },
                { "position": 4, "content": "六四，鸿渐于木，或得其桷，无咎。大雁渐进于树木，或许得到树枝，没有灾祸。" },
                { "position": 5, "content": "九五，鸿渐于陵，妇三岁不孕，终莫之胜，吉。大雁渐进于山陵，妇女三年不孕，最后没有什么能胜过她，吉祥。" },
                { "position": 6, "content": "上九，鸿渐于陆，其羽可用为仪，吉。大雁渐进于陆地，其羽毛可用作装饰，吉祥。" }
            ]
        },
        "54": {
            "name": "归妹",
            "unicode": "\u4DF5",
            "binary": "001011",
            "explanation": "立家兴业",
            "overview": "归妹为雷泽，象征婚姻与归宿。归妹卦代表婚姻、家庭和归属的阶段。",
            "detail": "归妹卦由震卦(雷)上兑卦(泽)下组成，象征着震雷惊动，少女归家。归妹原意是少女出嫁，引申为婚姻和家庭生活。归妹卦主要讲述的是婚姻关系和家庭生活，强调婚姻的重要性和家庭的和谐。归妹卦告诉我们，婚姻不仅仅是两个人的结合，更是两个家庭的联系，需要慎重对待。同时，婚姻也是人生的重要阶段，标志着责任和义务的增加。归妹卦的'立家兴业'教导我们，建立家庭的同时也要注重事业的发展，两者应当相辅相成。",
            "lines": [
                { "position": 1, "content": "初九，归妹以娣，跛能履，征吉。少女出嫁作为妾，跛脚的人也能行走，征途吉祥。" },
                { "position": 2, "content": "九二，眇能视，利幽人之贞。眼睛不好的人也能看见，有利于隐居者的坚持。" },
                { "position": 3, "content": "六三，归妹以须，反归以娣。少女出嫁拖延，反而回来作妾。" },
                { "position": 4, "content": "九四，归妹愆期，迟归有时。少女出嫁超过期限，迟归也有合适的时机。" },
                { "position": 5, "content": "六五，帝乙归妹，其君之袂，不如其娣之袂良，月几望，吉。帝乙嫁女，其嫁给君王的衣袖，不如其嫁给庶人的衣袖好，月亮几乎圆满，吉祥。" },
                { "position": 6, "content": "上六，女承筐无实，士刲羊无血，无攸利。女子提着没有东西的筐子，士人杀了没有血的羊，没有好处。" }
            ]
        },
        "55": {
            "name": "丰",
            "unicode": "\u4DF6",
            "binary": "001101",
            "explanation": "日中则斜",
            "overview": "丰为雷火，象征丰盛与壮大。丰卦代表充实、丰富和鼎盛的阶段。",
            "detail": "丰卦由震卦(雷)上离卦(火)下组成，象征着雷电交加，光明盛大。丰原意是丰盛，引申为繁荣和鼎盛。丰卦告诉我们，丰盛和鼎盛是美好的状态，但也是短暂的，就像太阳到达正午就会开始西斜一样，盛极必衰是自然规律。丰卦提醒我们，在鼎盛时期要保持清醒和谦虚，不要被一时的成功冲昏头脑，而是要未雨绸缪，为将来可能的变化做好准备。丰卦的'日中则斜'告诫我们，兴盛之后必有衰落，要珍惜当下的同时也要考虑长远。",
            "lines": [
                { "position": 1, "content": "初九，遇其配主，虽旬无咎，往有尚。遇到相配的主人，虽然十天也没有灾祸，前往会受到尊重。" },
                { "position": 2, "content": "六二，丰其蔀，日中见斗，往得疑疾，有孚发若，吉。草木茂盛，中午看见北斗星，前往会得到疑虑和疾病，有诚信会发达，吉祥。" },
                { "position": 3, "content": "九三，丰其沛，日中见昧，折其右肱，无咎。草木茂盛而下垂，中午看见微弱的星光，折断右臂，没有灾祸。" },
                { "position": 4, "content": "九四，丰其蔀，日中见斗，遇其夷主，吉。草木茂盛如帷幕，中午看见北斗星，遇到慈祥的主人，吉祥。" },
                { "position": 5, "content": "六五，来章，有庆誉，吉。前来显示功绩，有庆贺和赞誉，吉祥。" },
                { "position": 6, "content": "上六，丰其屋，蔀其家，窥其户，阒其无人，三岁不觌，凶。房屋宽敞，遮蔽家门，窥视门户，寂静无人，三年不见，凶险。" }
            ]
        },
        "56": {
            "name": "旅",
            "unicode": "\u4DF7",
            "binary": "101100",
            "explanation": "依义顺时",
            "overview": "旅为火山，象征旅行与寄居。旅卦代表旅途、寄居和暂时停留的阶段。",
            "detail": "旅卦由离卦(火)上艮卦(山)下组成，象征着火在山上，光明暂时停留。旅原意是旅行，引申为暂居和寄寓。旅卦告诉我们，人生中有时候需要离开熟悉的环境，到陌生的地方去探索和发展。在旅途中，我们需要适应不同的环境和文化，保持谦虚和灵活的态度。旅卦提醒我们，在旅途中要谨慎行事，不要太高调，也不要轻易相信陌生人。旅卦的'依义顺时'教导我们，在旅行和寄居的过程中，要遵守当地的规则和习俗，顺应时势的变化。",
            "lines": [
                { "position": 1, "content": "初六，旅琐琐，斯其所取灾。旅行琐碎纠缠，因此招致灾祸。" },
                { "position": 2, "content": "六二，旅即次，怀其资，得童仆贞。旅行到达住处，怀有财物，得到年轻的仆人，坚守正道。" },
                { "position": 3, "content": "九三，旅焚其次，丧其童仆，贞厉。旅行中住处被烧毁，失去年轻的仆人，坚持有危险。" },
                { "position": 4, "content": "九四，旅于处，得其资斧，我心不快。旅行中停留下来，得到一些财物，我心不快。" },
                { "position": 5, "content": "六五，射雉，一矢亡，终以誉命。射杀野鸡，一支箭失去，最终因为誉命。" },
                { "position": 6, "content": "上九，鸟焚其巢，旅人先笑后号啕，丧牛于易，凶。鸟巢被烧毁，旅行的人先笑后哭，在边境失去牛，凶险。" }
            ]
        },
        "57": {
            "name": "巽",
            "unicode": "\u4DF8",
            "binary": "110110",
            "explanation": "谦逊受益",
            "overview": "巽为风，象征顺从与谦逊。巽卦代表顺服、谦逊和依从的阶段。",
            "detail": "巽卦由两个巽卦(风)重叠而成，象征着风行云上，无所不入。巽原意是顺从，引申为谦逊和柔顺。巽卦告诉我们，顺从和谦逊是一种美德，能够帮助我们避免冲突和获得支持。就像风能够无处不在地渗透一样，谦逊的态度也能够打动人心，赢得他人的尊重和支持。巽卦提醒我们，顺从不是盲目的服从，而是在正确的原则下的灵活应变。巽卦的'谦逊受益'教导我们，谦逊的态度不仅能够避免冲突，还能够带来实质性的好处。",
            "lines": [
                { "position": 1, "content": "初六，进退，利武人之贞。进退有度，有利于武士的正道。" },
                { "position": 2, "content": "九二，巽在床下，用史巫纷若，吉，无咎。顺从在床下，用史官和巫师纷乱的占卜，吉祥，没有灾祸。" },
                { "position": 3, "content": "九三，频巽，吝。频繁地顺从，有困难。" },
                { "position": 4, "content": "六四，悔亡，田获三品。悔恨消失，田猎获得三种猎物。" },
                { "position": 5, "content": "九五，贞吉，悔亡，无不利，无初有终，先庚三日，后庚三日，吉。坚守正道，吉祥，悔恨消失，没有不利，没有开始有结束，先庚日三天，后庚日三天，吉祥。" },
                { "position": 6, "content": "上九，巽在床下，丧其资斧，贞凶。顺从在床下，失去财物，坚持有凶险。" }
            ]
        },
        "58": {
            "name": "兑",
            "unicode": "\u4DF9",
            "binary": "011011",
            "explanation": "刚内柔外",
            "overview": "兑为泽，象征喜悦与快乐。兑卦代表愉快、满足和欢乐的阶段。",
            "detail": "兑卦由两个兑卦(泽)重叠而成，象征着泽水澄清，喜悦自得。兑原意是喜悦，引申为愉快和满足。兑卦告诉我们，喜悦和快乐是人生追求的重要目标，但不能只追求表面的快乐，而忽略内心的修养和成长。兑卦提醒我们，真正的喜悦来自于内心的平静和满足，而不是外部环境的刺激。兑卦的'刚内柔外'教导我们，在外表保持柔和亲切的同时，内心要有坚定的原则和信念，这样才能获得真正的喜悦和满足。",
            "lines": [
                { "position": 1, "content": "初九，和兑，吉。和谐喜悦，吉祥。" },
                { "position": 2, "content": "九二，孚兑，吉，悔亡。诚信的喜悦，吉祥，悔恨消失。" },
                { "position": 3, "content": "六三，来兑，凶。吸引他人的喜悦，凶险。" },
                { "position": 4, "content": "九四，商兑，未宁，介疾有喜。商讨喜悦，尚未安宁，消除疾病则有喜悦。" },
                { "position": 5, "content": "九五，孚于剥，有厉。诚信于削弱者，有危险。" },
                { "position": 6, "content": "上六，引兑。引导喜悦。" }
            ]
        },
        "59": {
            "name": "涣",
            "unicode": "\u4DFA",
            "binary": "110010",
            "explanation": "拯救涣散",
            "overview": "涣为风水，象征分散与离散。涣卦代表离散、分离和涣散的阶段。",
            "detail": "涣卦由巽卦(风)上坎卦(水)下组成，象征风吹水散，四处分离。涣原意是分散，引申为离析和涣散。涣卦告诉我们，事物在发展过程中有时会出现分散和离析的状态，这是正常的现象。面对涣散的状态，我们需要采取适当的措施进行整合和凝聚，避免事态进一步恶化。涣卦提醒我们，即使在分散和离析的时候，也要保持内心的团结和联系，不要完全失去方向。涣卦的'拯救涣散'教导我们，在混乱和分散的局面中，需要有人挺身而出，进行整合和引导。",
            "lines": [
                { "position": 1, "content": "初六，用拯马壮，吉。用强壮的马来救助，吉祥。" },
                { "position": 2, "content": "九二，涣奔其机，悔亡。虽离散但奔向核心，悔恨消失。" },
                { "position": 3, "content": "六三，涣其躬，无悔。离散自身，没有悔恨。" },
                { "position": 4, "content": "六四，涣其群，元吉。涣散坏的集体，大吉大利。" },
                { "position": 5, "content": "九五，涣汗其大号，涣王居，无咎。下令集合众人，君王安居，没有灾祸。" },
                { "position": 6, "content": "上九，涣其血，去逖出，无咎。流血而去，远离险境，没有灾祸。" }
            ]
        },
        "60": {
            "name": "节",
            "unicode": "\u4DFB",
            "binary": "010011",
            "explanation": "万物有节",
            "overview": "节为水泽，象征节制与制约。节卦代表需要限制、节约和自律的阶段。",
            "detail": "节卦由坎卦(水)上兑卦(泽)下组成，象征水流入泽而有节度。节原意是竹节，引申为节制和限制。节卦告诉我们，任何事物都需要有适当的限制和规范，否则容易走向极端。就像河水需要河床的限制才能形成河流一样，人的行为也需要道德和法律的约束。节卦提醒我们，节制不是刻板和僵化，而是在遵守规则的前提下保持灵活和适应性。节卦的'万物有节'教导我们，自然界中的一切都有其规律和界限，人也应当尊重这些规律，遵守适当的限制。",
            "lines": [
                { "position": 1, "content": "初九，不出户庭，无咎。不出户庭，没有灾祸。" },
                { "position": 2, "content": "九二，不出门庭，凶。不出门庭，凶险。" },
                { "position": 3, "content": "六三，不节若，则嗟若，无咎。不节制则会叹息，没有灾祸。" },
                { "position": 4, "content": "六四，安节，吉。安于节制，吉祥。" },
                { "position": 5, "content": "九五，甘节，吉，往有尚。甘于节制，吉祥，前往会受到尊重。" },
                { "position": 6, "content": "上六，苦节，贞凶，悔亡。过于严格的节制，坚持有凶险，悔恨消失。" }
            ]
        },
        "61": {
            "name": "中孚",
            "unicode": "\u4DFC",
            "binary": "110011",
            "explanation": "诚信立身",
            "overview": "中孚为风泽，象征诚信与信念。中孚卦代表诚信、信任和相互信赖的阶段。",
            "detail": "中孚卦由巽卦(风)上兑卦(泽)下组成，象征风行泽上，诚信感通。中孚原意是怀有诚信，引申为诚实和信任。中孚卦告诉我们，诚信是人际关系和社会和谐的基础，只有彼此信任，社会才能正常运转。中孚卦提醒我们，诚信不仅仅是表面的诚实，更是内心的真诚和坚持。只有自己先相信并坚持真理，才能赢得他人的信任。中孚卦的'诚信立身'教导我们，以诚信为立身之本，无论在什么情况下都保持诚实和正直，这样才能赢得他人的尊重和信任。",
            "lines": [
                { "position": 1, "content": "初九，虞吉，有它不燕。诚信吉祥，有其他事情则不安。" },
                { "position": 2, "content": "九二，鸣鹤在阴，其子和之，我有好爵，吾与尔靡之。鹤在阴暗处鸣叫，它的幼崽和鸣，我有美酒，与你共饮。" },
                { "position": 3, "content": "六三，得敌，或鼓或罢，或泣或歌。遇到敌人，或鼓舞或停止，或哭泣或歌唱。" },
                { "position": 4, "content": "六四，月几望，马匹亡，无咎。月亮几乎圆满，马匹失去，没有灾祸。" },
                { "position": 5, "content": "九五，有孚挛如，无咎。有诚信聚集在一起，没有灾祸。" },
                { "position": 6, "content": "上九，翰音登于天，贞凶。鸟鸣声上达天空，坚持会有凶险。" }
            ]
        },
        "62": {
            "name": "小过",
            "unicode": "\u4DFD",
            "binary": "001100",
            "explanation": "行动有度",
            "overview": "小过为雷山，象征小过与超越。小过卦代表小的过错、轻微的越轨的阶段。",
            "detail": "小过卦由震卦(雷)上艮卦(山)下组成，象征雷声出山，小有越过。小过原意是小的过失，引申为轻微的越轨和小的过错。小过卦告诉我们，在生活中难免会有小的过失和错误，这是正常的现象。面对这些小过失，不要过分在意，而是要吸取教训，努力改正。小过卦提醒我们，适当的越轨有时候是必要的，过分的遵守常规可能会阻碍创新和发展。小过卦的'行动有度'教导我们，行动要适度，不要过分，也不要不足，保持适当的平衡。",
            "lines": [
                { "position": 1, "content": "初六，飞鸟以凶。飞鸟带来凶险，象征轻率的行动会带来危险。" },
                { "position": 2, "content": "六二，过其祖，遇其妣，不及其君，遇其臣，无咎。越过祖父，遇到祖母，未及君王，遇到臣子，没有灾祸。" },
                { "position": 3, "content": "九三，弗过防之，从或戕之，凶。不过分防备，跟从者会伤害它，凶险。" },
                { "position": 4, "content": "九四，无咎，弗过遇之，往厉必戒，勿用永贞。没有灾祸，不过分遇见它，前进有危险必须警戒，不要长期坚持。" },
                { "position": 5, "content": "六五，密云不雨，自我西郊，公弋取彼在穴。密云不下雨，从西郊开始，公爵用弓箭射中在洞穴中的兽。" },
                { "position": 6, "content": "上六，弗遇过之，飞鸟离之，凶，是谓灾眚。不遇越过，飞鸟离去，凶险，这叫做灾难。" }
            ]
        },
        "63": {
            "name": "既济",
            "unicode": "\u4DFE",
            "binary": "010101",
            "explanation": "盛极将衰",
            "overview": "既济为水火，象征既济与完成。既济卦代表事业完成、功成名就的阶段。",
            "detail": "既济卦由坎卦(水)上离卦(火)下组成，象征水火相济，阴阳调和。既济原意是已经渡过，引申为完成和成功。既济卦代表着事业已经完成，达到了理想的状态。但是，既济卦提醒我们，事物发展到顶点后就会开始衰退，这是自然规律。因此，在成功的时候不要骄傲自满，而是要居安思危，为可能的变化做好准备。既济卦的'盛极将衰'告诫我们，事物发展到极点后就会开始衰退，这是不可避免的，我们要有清醒的认识和准备。",
            "lines": [
                { "position": 1, "content": "初九，曳其轮，濡其尾，无咎。拖着车轮，沾湿尾巴，没有灾祸。" },
                { "position": 2, "content": "六二，妇丧其茀，勿逐，七日得。妇人失去垫头的茀，不要追寻，七天后自然得到。" },
                { "position": 3, "content": "九三，高宗伐鬼方，三年克之，小人勿用。高宗征伐鬼方，三年才征服，不要任用小人。" },
                { "position": 4, "content": "六四，繻有衣袽，终日戒。有破洞的绸缎衣服，整天警戒。" },
                { "position": 5, "content": "九五，东邻杀牛，不如西邻之禴祭，实受其福。东邻杀牛祭祀，不如西邻的简单祭祀，实际上获得福分。" },
                { "position": 6, "content": "上六，濡其首，厉。沾湿头部，危险。" }
            ]
        },
        "64": {
            "name": "未济",
            "unicode": "\u4DFF",
            "binary": "101010",
            "explanation": "事业未竟",
            "overview": "未济为火水，象征未济与未完成。未济卦代表尚未完成、仍在进行的阶段。",
            "detail": "未济卦由离卦(火)上坎卦(水)下组成，象征火在水上，阴阳相错。未济原意是尚未渡过，引申为未完成和进行中。未济卦是既济卦的相反，代表事业尚未完成，还在进行中的状态。未济卦告诉我们，在事情尚未完成的时候，需要保持耐心和毅力，不要半途而废。同时，也要保持警惕和谨慎，避免因为操之过急而导致失败。未济卦的'事业未竟'提醒我们，事业尚未完成时要继续努力，不要松懈，同时也要善于等待时机，把握机会。",
            "lines": [
                { "position": 1, "content": "初六，濡其尾，吝。沾湿尾巴，有困难。" },
                { "position": 2, "content": "九二，曳其轮，贞吉。拖着车轮，坚守正道，吉祥。" },
                { "position": 3, "content": "六三，未济，征凶，利涉大川。尚未完成，前进有凶险，适合渡过大河。" },
                { "position": 4, "content": "九四，贞吉，悔亡，震用伐鬼方，三年有赏于大国。坚守正道，吉祥，悔恨消失，震动用来征伐鬼方，三年得到大国的赏赐。" },
                { "position": 5, "content": "六五，贞吉，无悔，君子之光，有孚，吉。坚守正道，吉祥，没有悔恨，君子的光明，有诚信，吉祥。" },
                { "position": 6, "content": "上九，有孚于饮酒，无咎，濡其首，有孚失是。有诚信地饮酒，没有灾祸，沾湿头部，有诚信也会失去。" }
            ]
        }
    }

    let hexagramMap = {};
    let isInitialized = false;

    // 初始化
    async function init() {
        try {
            if (isInitialized) return;

            YizhiApp.performance.start('hexagram_data_init');

            // 处理卦象数据
            await processHexagramData();

            isInitialized = true;
            YizhiApp.performance.end('hexagram_data_init');

            YizhiApp.events.emit('hexagram-data:ready');
        } catch (error) {
            YizhiApp.errors.handle(error, 'Hexagram Data Service Init');
        }
    }

    // 处理卦象数据
    async function processHexagramData() {
        hexagramMap = YizhiApp.utils.deepClone(hexagramsData);

        for (const key in hexagramMap) {
            const id = parseInt(key);
            hexagramMap[key].id = id;

            // 计算上卦和下卦
            calculateTrigrams(hexagramMap[key]);

            // 计算相关卦象关系
            calculateRelations(hexagramMap[key]);
        }
    }

    // 计算卦象的上下卦
    function calculateTrigrams(hexagram) {
        const binary = hexagram.binary;
        if (binary && binary.length === 6) {
            const upperBinary = binary.slice(0, 3);
            const lowerBinary = binary.slice(3);

            hexagram.upperTrigram = getBaguaByBinary(upperBinary);
            hexagram.lowerTrigram = getBaguaByBinary(lowerBinary);
        }
    }

    // 计算关系数据结构
    function calculateRelations(hexagram) {
        hexagram.relations = {};
        hexagram.relations.opposite = calculateOpposite(hexagram.binary);
        hexagram.relations.inverse = calculateInverse(hexagram.binary);
        hexagram.relations.mutual = calculateMutual(hexagram.binary);
    }

    // 计算对宫卦
    function calculateOpposite(binary) {
        const oppositeBinary = binary.split('').map(bit => bit === '1' ? '0' : '1').join('');
        return getHexagramIdByBinary(oppositeBinary);
    }

    // 计算综卦
    function calculateInverse(binary) {
        const inverseBinary = binary.split('').reverse().join('');
        return getHexagramIdByBinary(inverseBinary);
    }

    // 计算互卦
    function calculateMutual(binary) {
        const third = binary.charAt(2);
        const fourth = binary.charAt(3);
        const fifth = binary.charAt(4);
        const second = binary.charAt(1);

        const mutualBinary = second + third + fourth + third + fourth + fifth;
        return getHexagramIdByBinary(mutualBinary);
    }

    // 通过二进制获取卦象ID
    function getHexagramIdByBinary(binary) {
        for (const key in hexagramMap) {
            if (hexagramMap[key].binary === binary) {
                return parseInt(key);
            }
        }
        return 1;
    }

    // 根据二进制代码获取八卦
    function getBaguaByBinary(binary) {
        for (const name in baguaData) {
            if (baguaData[name].binary === binary) {
                return name;
            }
        }
        return null;
    }

    // 公共API方法
    function getHexagramByBinary(binary) {
        for (const key in hexagramMap) {
            if (hexagramMap[key].binary === binary) {
                const hexagram = hexagramMap[key];
                if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                    calculateTrigrams(hexagram);
                }
                return hexagram;
            }
        }
        return null;
    }

    function getHexagramById(id) {
        const hexagram = hexagramMap[id] || null;
        if (hexagram) {
            if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                calculateTrigrams(hexagram);
            }
            if (!hexagram.relations) {
                calculateRelations(hexagram);
            }
        }
        return hexagram;
    }

    function getBaguaData() {
        return baguaData;
    }

    function getBagua(name) {
        return baguaData[name] || null;
    }

    function getHexagramByTrigrams(upper, lower) {
        for (const key in hexagramMap) {
            const hexagram = hexagramMap[key];
            if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                calculateTrigrams(hexagram);
            }
            if (hexagram.upperTrigram === upper && hexagram.lowerTrigram === lower) {
                return hexagram;
            }
        }
        return null;
    }

    function searchHexagrams(keyword) {
        keyword = keyword.toLowerCase();
        const results = [];

        for (const key in hexagramMap) {
            const hexagram = hexagramMap[key];
            if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                calculateTrigrams(hexagram);
            }

            if (hexagram.name.toLowerCase().includes(keyword) ||
                hexagram.explanation.toLowerCase().includes(keyword) ||
                (hexagram.overview && hexagram.overview.toLowerCase().includes(keyword)) ||
                (hexagram.detail && hexagram.detail.toLowerCase().includes(keyword))) {
                results.push(hexagram);
            }
        }

        return results;
    }

    function getRelatedHexagrams(hexagramId) {
        const hexagram = hexagramMap[hexagramId];
        if (!hexagram || !hexagram.relations) {
            return {};
        }

        const related = {};
        for (const [type, id] of Object.entries(hexagram.relations)) {
            related[type] = getHexagramById(id);
        }

        return related;
    }

    function getAllHexagrams() {
        return Object.values(hexagramMap);
    }

    return {
        init,
        getHexagramByBinary,
        getHexagramById,
        getBaguaData,
        getBagua,
        getHexagramByTrigrams,
        searchHexagrams,
        getRelatedHexagrams,
        getAllHexagrams,
        get isInitialized() { return isInitialized; }
    };
})();

/**
 * 占卜模块 - 管理铜钱投掷和卦象生成
 */
const DivinationModule = (function() {
    // 私有变量
    const throwCoinBtn = document.getElementById('throwCoinBtn');
    const changeHexagramBtn = document.getElementById('changeHexagramBtn');
    const resetBtn = document.getElementById('resetBtn');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const hexagramContainer = document.getElementById('hexagramContainer');
    const hexagramNameDisplay = document.getElementById('hexagramName');
    const hexagramUnicodeDisplay = document.getElementById('hexagramUnicode');
    const hexagramExplanationDisplay = document.getElementById('hexagramExplanation');
    const upperTrigramInfo = document.getElementById('upperTrigramInfo');
    const lowerTrigramInfo = document.getElementById('lowerTrigramInfo');
    const coinsDisplay = document.getElementById('coinsDisplay');
    const coinsResult = document.getElementById('coinsResult');
    const overviewContent = document.getElementById('overviewContent');
    const detailContent = document.getElementById('detailContent');
    const linesContent = document.getElementById('linesContent');
    const relationsContent = document.getElementById('relationItems');
    const progressBar = document.getElementById('progressBar');
    const progressCount = document.getElementById('progressCount');
    const throwSubtitle = document.getElementById('throwSubtitle');

    // 步骤指引
    const steps = {
        step1: document.getElementById('step1'),
        step2: document.getElementById('step2'),
        step3: document.getElementById('step3'),
        step4: document.getElementById('step4')
    };

    let lines = [];
    let transformed = false;
    let animationInProgress = false;
    const positionCode = "010101";

    // 初始化
    function init() {
        try {
            bindEvents();
            initializeUI();

            // 监听卦象数据准备完成事件
            YizhiApp.events.on('hexagram-data:ready', () => {
                updateHexagramDisplay();
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Divination Module Init');
        }
    }

    // 绑定事件
    function bindEvents() {
        throwCoinBtn?.addEventListener('click', handleThrowCoins);
        changeHexagramBtn?.addEventListener('click', toggleChangingLines);
        resetBtn?.addEventListener('click', handleReset);
        saveBtn?.addEventListener('click', saveToHistory);
        exportBtn?.addEventListener('click', exportResult);
    }

    // 初始化UI
    function initializeUI() {
        resetDivination();
        updateProgress(0);
        updateStep(1);
    }

    // 激活时的处理
    function onActivate() {
        // 检查是否有未完成的占卜
        if (lines.length > 0 && lines.length < 6) {
            YizhiApp.getModule('notification')?.show('info', '继续占卜',
                `您有一个进行到第${lines.length}爻的占卜，可以继续完成。`);
        }
    }

    // 处理投掷铜钱
    async function handleThrowCoins() {
        if (animationInProgress || lines.length >= 6) return;

        try {
            animationInProgress = true;
            throwCoinBtn.disabled = true;

            updateStep(1);
            await throwThreeCoins();

            updateProgress((lines.length / 6) * 100);
            updateProgressCount();
            updateThrowButtonText();

            if (lines.length >= 3) {
                updateStep(2);
            }

            if (lines.length === 6) {
                handleDivinationComplete();
            }

        } catch (error) {
            YizhiApp.errors.handle(error, 'Throw Coins');
        } finally {
            animationInProgress = false;
            if (lines.length < 6) {
                throwCoinBtn.disabled = false;
            }
        }
    }

    // 投掷三枚铜钱
    function throwThreeCoins() {
        return new Promise((resolve) => {
            // 清空上一次的铜钱显示
            if (coinsDisplay) {
                coinsDisplay.innerHTML = '';
            }

            // 创建三个铜钱
            const coinElements = [];
            for (let i = 0; i < 3; i++) {
                const coin = createCoinElement();
                coinElements.push(coin);
                coinsDisplay?.appendChild(coin);
            }

            // 延迟开始动画
            setTimeout(() => {
                const results = [];

                coinElements.forEach((coin, index) => {
                    const isHeads = Math.random() < 0.5;
                    const finalRotation = isHeads ? '0deg' : '180deg';

                    results.push(isHeads ? 3 : 2);

                    coin.classList.add('flipping');
                    coin.style.setProperty('--final-rotation', finalRotation);
                });

                // 等待动画结束
                setTimeout(() => {
                    const sum = results.reduce((a, b) => a + b, 0);
                    const lineInfo = interpretCoinResult(sum);

                    lines.push(lineInfo);
                    displayCoinResult(results, lineInfo);
                    renderHexagram();
                    updateHexagramDisplay();

                    resolve();
                }, 1500);
            }, 100);
        });
    }

    // 创建铜钱元素
    function createCoinElement() {
        const coinContainer = document.createElement('div');
        coinContainer.className = 'coin';

        const coinInner = document.createElement('div');
        coinInner.className = 'coin-inner';

        const frontFace = document.createElement('div');
        frontFace.className = 'coin-face coin-front';
        frontFace.textContent = '阳';

        const backFace = document.createElement('div');
        backFace.className = 'coin-face coin-back';
        backFace.textContent = '阴';

        coinInner.appendChild(frontFace);
        coinInner.appendChild(backFace);
        coinContainer.appendChild(coinInner);

        return coinContainer;
    }

    // 解释铜钱结果
    function interpretCoinResult(sum) {
        const interpretations = {
            6: { type: 'yin', changing: true, name: '老阴' },
            7: { type: 'yang', changing: false, name: '少阳' },
            8: { type: 'yin', changing: false, name: '少阴' },
            9: { type: 'yang', changing: true, name: '老阳' }
        };

        return interpretations[sum] || interpretations[7];
    }

    // 显示铜钱结果
    function displayCoinResult(coinResults, lineInfo) {
        if (!coinsResult) return;

        const resultText = `${coinResults.join(' + ')} = ${coinResults.reduce((a, b) => a + b, 0)} (${lineInfo.name})`;
        coinsResult.textContent = resultText;

        // 添加颜色指示
        coinsResult.className = `coins-result ${lineInfo.changing ? 'changing' : 'stable'}`;
    }

    // 渲染卦象
    function renderHexagram(customLines = null) {
        if (!hexagramContainer) return;

        const currentLines = customLines || lines;
        hexagramContainer.innerHTML = '';

        if (currentLines.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'hexagram-placeholder';
            placeholder.innerHTML = '<div class="placeholder-text">请开始投掷铜钱形成卦象</div>';
            hexagramContainer.appendChild(placeholder);
            return;
        }

        const fragment = document.createDocumentFragment();
        currentLines.forEach((lineObj, index) => {
            const lineDiv = createLineElement(lineObj, index, currentLines.length);
            fragment.appendChild(lineDiv);
        });

        hexagramContainer.appendChild(fragment);
    }

    // 创建爻线元素
    function createLineElement(lineObj, index, totalLines) {
        const lineDiv = document.createElement('div');
        lineDiv.classList.add('line', lineObj.type);

        if (lineObj.changing) {
            lineDiv.classList.add('changing');
        }

        // 检查当位
        const lineBitIndex = 5 - index;
        const positionBit = positionCode.charAt(lineBitIndex);
        const lineBit = lineObj.type === 'yang' ? '1' : '0';

        if (lineBit !== positionBit) {
            lineDiv.classList.add('not-position');
        }

        // 新添加的爻线动画
        if (index === totalLines - 1) {
            lineDiv.classList.add('new-line');
        }

        // 创建线段
        if (lineObj.type === 'yang') {
            const segment = document.createElement('div');
            segment.classList.add('segment');
            lineDiv.appendChild(segment);
        } else {
            const segmentLeft = document.createElement('div');
            segmentLeft.classList.add('segment', 'left');

            const gap = document.createElement('div');
            gap.classList.add('middle-gap');

            const segmentRight = document.createElement('div');
            segmentRight.classList.add('segment', 'right');

            lineDiv.appendChild(segmentLeft);
            lineDiv.appendChild(gap);
            lineDiv.appendChild(segmentRight);
        }

        return lineDiv;
    }

    // 处理占卜完成
    function handleDivinationComplete() {
        throwCoinBtn.disabled = true;
        changeHexagramBtn.disabled = false;
        saveBtn.disabled = false;
        exportBtn.disabled = false;

        updateStep(3);

        // 显示完成通知
        const changingCount = lines.filter(line => line.changing).length;
        const message = changingCount > 0
            ? `占卜完成！发现${changingCount}个变爻，建议查看变卦。`
            : '占卜完成！未发现变爻，当前卦象稳定。';

        YizhiApp.getModule('notification')?.show('success', '占卜完成', message);
    }

    // 更新卦象显示
    function updateHexagramDisplay(customLines = null) {
        if (!YizhiApp.getModule('hexagramData')?.isInitialized) {
            return;
        }

        const currentLines = customLines || lines;

        if (currentLines.length !== 6) {
            resetDisplays();
            return;
        }

        try {
            const binary = generateBinaryFromLines(currentLines);
            const hexagram = YizhiApp.getModule('hexagramData').getHexagramByBinary(binary);

            if (hexagram) {
                updateHexagramInfo(hexagram);
                updateTrigramInfo(hexagram);
                updateContentTabs(hexagram);
                updateRelatedHexagrams(hexagram.id);
                saveBtn.disabled = false;
                exportBtn.disabled = false;
            } else {
                showHexagramNotFound();
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Update Hexagram Display');
        }
    }

    // 从爻线生成二进制
    function generateBinaryFromLines(currentLines) {
        let binary = '';
        for (let i = 5; i >= 0; i--) {
            binary += currentLines[i].type === 'yang' ? '1' : '0';
        }
        return binary;
    }

    // 更新卦象基本信息
    function updateHexagramInfo(hexagram) {
        if (hexagramNameDisplay) {
            hexagramNameDisplay.textContent = hexagram.name;
        }
        if (hexagramUnicodeDisplay) {
            hexagramUnicodeDisplay.textContent = hexagram.unicode;
        }
        if (hexagramExplanationDisplay) {
            hexagramExplanationDisplay.textContent = hexagram.explanation || '';
        }
    }

    // 更新上下卦信息
    function updateTrigramInfo(hexagram) {
        if (!upperTrigramInfo || !lowerTrigramInfo) return;

        if (hexagram.upperTrigram && hexagram.lowerTrigram) {
            const upperBagua = YizhiApp.getModule('hexagramData').getBagua(hexagram.upperTrigram);
            const lowerBagua = YizhiApp.getModule('hexagramData').getBagua(hexagram.lowerTrigram);

            upperTrigramInfo.textContent = upperBagua
                ? `上卦: ${hexagram.upperTrigram} ${upperBagua.symbol} (${upperBagua.nature})`
                : '';

            lowerTrigramInfo.textContent = lowerBagua
                ? `下卦: ${hexagram.lowerTrigram} ${lowerBagua.symbol} (${lowerBagua.nature})`
                : '';
        } else {
            upperTrigramInfo.textContent = '';
            lowerTrigramInfo.textContent = '';
        }
    }

    // 更新内容标签页
    function updateContentTabs(hexagram) {
        updateContent(overviewContent, hexagram.overview || '暂无数据');
        updateContent(detailContent, hexagram.detail || '暂无数据');
        updateLinesContent(hexagram);
    }

    // 更新内容
    function updateContent(element, content) {
        if (element) {
            element.innerHTML = `<div class="content-text">${content}</div>`;
        }
    }

    // 更新爻辞内容
    function updateLinesContent(hexagram) {
        if (!linesContent) return;

        linesContent.innerHTML = '';

        if (hexagram.lines && hexagram.lines.length > 0) {
            hexagram.lines.forEach(line => {
                const lineDetail = createLineDetail(line);
                linesContent.appendChild(lineDetail);
            });
        } else {
            linesContent.innerHTML = '<div class="empty-state"><p>暂无爻辞数据</p></div>';
        }
    }

    // 创建爻辞详情元素
    function createLineDetail(line) {
        const lineDetail = document.createElement('div');
        lineDetail.className = 'line-reading';

        const position = line.position || 0;
        const content = line.content || '暂无爻辞';

        lineDetail.innerHTML = `
            <div class="line-position">第${position}爻</div>
            <p class="line-content">${content}</p>
        `;

        if (lines[position - 1]?.changing) {
            lineDetail.classList.add('changing-line-highlight');
        }

        return lineDetail;
    }

    // 更新相关卦象
    function updateRelatedHexagrams(hexagramId) {
        if (!relationsContent) return;

        relationsContent.innerHTML = '';

        const related = YizhiApp.getModule('hexagramData').getRelatedHexagrams(hexagramId);

        if (!related || Object.keys(related).length === 0) {
            relationsContent.innerHTML = '<div class="empty-state"><p>暂无相关卦象数据</p></div>';
            return;
        }

        const relationTypes = {
            opposite: '对宫卦',
            inverse: '综卦',
            mutual: '互卦'
        };

        for (const [type, hexagram] of Object.entries(related)) {
            if (!hexagram) continue;

            const relationItem = createRelationItem(hexagram, relationTypes[type] || type);
            relationsContent.appendChild(relationItem);
        }
    }

    // 创建关系项元素
    function createRelationItem(hexagram, typeName) {
        const relationItem = document.createElement('div');
        relationItem.className = 'relation-item';
        relationItem.innerHTML = `
            <div class="relation-symbol">${hexagram.unicode || ''}</div>
            <div class="relation-info">
                <div class="relation-name">${hexagram.name || '未知卦象'}</div>
                <div class="relation-type">${typeName}</div>
            </div>
        `;

        relationItem.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });

        return relationItem;
    }

    // 重置显示
    function resetDisplays() {
        if (hexagramNameDisplay) hexagramNameDisplay.textContent = '待演算';
        if (hexagramUnicodeDisplay) hexagramUnicodeDisplay.textContent = '';
        if (hexagramExplanationDisplay) hexagramExplanationDisplay.textContent = '';
        if (upperTrigramInfo) upperTrigramInfo.textContent = '';
        if (lowerTrigramInfo) lowerTrigramInfo.textContent = '';

        const emptyState = '<div class="empty-state"><svg class="empty-icon" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7,13H17V11H7"></path></svg><p>请完成卦象演算以查看详细解读</p></div>';

        if (overviewContent) overviewContent.innerHTML = emptyState;
        if (detailContent) detailContent.innerHTML = emptyState;
        if (linesContent) linesContent.innerHTML = emptyState;
        if (relationsContent) relationsContent.innerHTML = emptyState;
    }

    // 显示卦象未找到
    function showHexagramNotFound() {
        if (hexagramNameDisplay) hexagramNameDisplay.textContent = '未找到对应卦名';
        if (hexagramUnicodeDisplay) hexagramUnicodeDisplay.textContent = '';
        if (hexagramExplanationDisplay) hexagramExplanationDisplay.textContent = '';
        resetDisplays();
    }

    // 变卦显示
    function toggleChangingLines() {
        if (lines.length !== 6) return;

        try {
            if (transformed) {
                renderHexagram();
                updateHexagramDisplay();
                changeHexagramBtn.textContent = '变卦显示';
                transformed = false;
            } else {
                const transformedLines = lines.map(line => {
                    if (line.changing) {
                        return {
                            type: line.type === 'yang' ? 'yin' : 'yang',
                            changing: false
                        };
                    }
                    return { ...line };
                });

                renderHexagram(transformedLines);
                updateHexagramDisplay(transformedLines);
                changeHexagramBtn.textContent = '恢复本卦';
                transformed = true;
                updateStep(4);
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Toggle Changing Lines');
        }
    }

    // 处理重置
    async function handleReset() {
        const confirmed = await YizhiApp.confirm.show(
            '确认重置',
            '确定要重新开始占卜吗？当前进度将会丢失。',
            { danger: true, okText: '重新开始' }
        );

        if (confirmed) {
            resetDivination();
            YizhiApp.getModule('notification')?.show('info', '重新起卦',
                '已重置占卜，可以开始新的一次演算。');
        }
    }

    // 重置占卜
    function resetDivination() {
        lines = [];
        transformed = false;
        animationInProgress = false;

        renderHexagram();
        resetDisplays();

        if (coinsDisplay) coinsDisplay.innerHTML = '';
        if (coinsResult) coinsResult.textContent = '';

        // 重置按钮状态
        throwCoinBtn.disabled = false;
        changeHexagramBtn.disabled = true;
        saveBtn.disabled = true;
        exportBtn.disabled = true;
        changeHexagramBtn.textContent = '变卦显示';

        // 重置进度
        updateProgress(0);
        updateProgressCount();
        updateThrowButtonText();
        updateStep(1);
    }

    // 保存到历史记录
    function saveToHistory() {
        if (lines.length !== 6) return;

        try {
            const binary = generateBinaryFromLines(lines);
            const hexagram = YizhiApp.getModule('hexagramData').getHexagramByBinary(binary);

            if (!hexagram) return;

            const historyItem = {
                id: YizhiApp.utils.generateId(),
                date: YizhiApp.utils.formatDate(new Date()),
                hexagram: hexagram,
                lines: YizhiApp.utils.deepClone(lines),
                notes: '',
                changingLinesCount: lines.filter(line => line.changing).length
            };

            YizhiApp.getModule('history')?.addRecord(historyItem);
            YizhiApp.getModule('notification')?.show('success', '保存成功',
                '占卜结果已保存到历史记录。', 3000);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Save to History');
        }
    }

    // 导出结果
    function exportResult() {
        if (lines.length !== 6) return;

        try {
            const binary = generateBinaryFromLines(lines);
            const hexagram = YizhiApp.getModule('hexagramData').getHexagramByBinary(binary);

            if (!hexagram) return;

            const exportData = {
                date: YizhiApp.utils.formatDate(new Date()),
                hexagram: {
                    name: hexagram.name,
                    explanation: hexagram.explanation,
                    overview: hexagram.overview,
                    detail: hexagram.detail
                },
                lines: lines.map((line, index) => ({
                    position: index + 1,
                    type: line.type,
                    changing: line.changing
                })),
                changingLinesCount: lines.filter(line => line.changing).length
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `易之占卜_${hexagram.name}_${YizhiApp.utils.formatDate(new Date(), 'YYYY-MM-DD_HH-mm-ss')}.json`;
            link.click();

            URL.revokeObjectURL(link.href);

            YizhiApp.getModule('notification')?.show('success', '导出成功',
                '占卜结果已导出到本地文件。');
        } catch (error) {
            YizhiApp.errors.handle(error, 'Export Result');
        }
    }

    // 更新进度条
    function updateProgress(percentage) {
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    // 更新进度计数
    function updateProgressCount() {
        if (progressCount) {
            progressCount.textContent = `${lines.length}/6`;
        }
    }

    // 更新投掷按钮文本
    function updateThrowButtonText() {
        if (throwSubtitle) {
            throwSubtitle.textContent = lines.length < 6 ? `第${lines.length + 1}爻` : '已完成';
        }
    }

    // 更新步骤指引
    function updateStep(step) {
        Object.values(steps).forEach(stepEl => {
            if (stepEl) {
                stepEl.classList.remove('active', 'completed');
            }
        });

        for (let i = 1; i < step; i++) {
            if (steps[`step${i}`]) {
                steps[`step${i}`].classList.add('completed');
            }
        }

        if (steps[`step${step}`]) {
            steps[`step${step}`].classList.add('active');
        }
    }

    return {
        init,
        onActivate,
        renderHexagram,
        updateHexagramDisplay,
        resetDivination
    };
})();

/**
 * 历史记录模块 - 管理占卜历史记录
 */
const HistoryModule = (function() {
    // 私有变量
    const historyList = document.getElementById('historyList');
    const filterButtons = document.querySelectorAll('.filter-item');
    const historySearchInput = document.getElementById('historySearchInput');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const totalRecords = document.getElementById('totalRecords');
    const thisWeekRecords = document.getElementById('thisWeekRecords');
    const changingLines = document.getElementById('changingLines');

    let currentFilter = 'all';
    let searchQuery = '';
    const STORAGE_KEY = 'divination_history';

    // 初始化
    function init() {
        try {
            initFilters();
            initSearch();
            initExportClear();
            updateHistoryDisplay();
            updateStats();
        } catch (error) {
            YizhiApp.errors.handle(error, 'History Module Init');
        }
    }

    // 激活时的操作
    function onActivate() {
        updateHistoryDisplay();
        updateStats();
    }

    // 初始化筛选器
    function initFilters() {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');

                // 更新按钮状态
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // 更新当前筛选器
                currentFilter = filter;

                // 重新加载历史记录
                updateHistoryDisplay();
            });
        });
    }

    // 初始化搜索
    function initSearch() {
        if (historySearchInput) {
            historySearchInput.addEventListener('input', YizhiApp.utils.debounce((e) => {
                searchQuery = e.target.value.trim();
                updateHistoryDisplay();
            }, 300));
        }
    }

    // 初始化导出和清空按钮
    function initExportClear() {
        exportHistoryBtn?.addEventListener('click', exportHistory);
        clearHistoryBtn?.addEventListener('click', clearHistory);
    }

    // 添加历史记录
    function addRecord(record) {
        try {
            let history = getHistoryRecords();
            history.unshift(record);

            // 限制历史记录数量
            if (history.length > 200) {
                history = history.slice(0, 200);
            }

            YizhiApp.storage.setItem(STORAGE_KEY, history);
            updateHistoryDisplay();
            updateStats();
        } catch (error) {
            YizhiApp.errors.handle(error, 'Add History Record');
        }
    }

    // 获取历史记录
    function getHistoryRecords() {
        return YizhiApp.storage.getItem(STORAGE_KEY, []);
    }

    // 获取筛选后的历史记录
    function getFilteredRecords() {
        try {
            let allRecords = getHistoryRecords();

            // 应用时间筛选
            if (currentFilter !== 'all') {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

                allRecords = allRecords.filter(record => {
                    const recordDate = new Date(record.date);

                    switch (currentFilter) {
                        case 'today':
                            return recordDate >= today;
                        case 'week':
                            return recordDate >= weekStart;
                        case 'month':
                            return recordDate >= monthStart;
                        default:
                            return true;
                    }
                });
            }

            // 应用搜索筛选
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                allRecords = allRecords.filter(record => {
                    return record.hexagram.name.toLowerCase().includes(query) ||
                           record.hexagram.explanation.toLowerCase().includes(query) ||
                           (record.notes && record.notes.toLowerCase().includes(query));
                });
            }

            return allRecords;
        } catch (error) {
            YizhiApp.errors.handle(error, 'Get Filtered Records');
            return [];
        }
    }

    // 删除历史记录
    function deleteRecord(id) {
        try {
            let history = getHistoryRecords();
            history = history.filter(record => record.id !== id);
            YizhiApp.storage.setItem(STORAGE_KEY, history);
            updateHistoryDisplay();
            updateStats();

            YizhiApp.getModule('notification')?.show('info', '删除成功', '历史记录已删除。');
        } catch (error) {
            YizhiApp.errors.handle(error, 'Delete History Record');
        }
    }

    // 更新历史记录显示
    function updateHistoryDisplay() {
        if (!historyList) return;

        try {
            const records = getFilteredRecords();

            if (records.length === 0) {
                historyList.innerHTML = createEmptyState();
                return;
            }

            const fragment = document.createDocumentFragment();
            records.forEach(record => {
                const historyItem = createHistoryItem(record);
                fragment.appendChild(historyItem);
            });

            historyList.innerHTML = '';
            historyList.appendChild(fragment);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Update History Display');
        }
    }

    // 创建空状态
    function createEmptyState() {
        return `
            <div class="empty-history">
                <svg class="empty-icon" viewBox="0 0 24 24">
                    <path d="M13,3C9.1,3,6,6.1,6,10h1.6L5,13.5L2.4,10H4c0-5,4-9,9-9s9,4,9,9s-4,9-9,9c-2.4,0-4.6-0.9-6.3-2.6L5.3,17.8C7.5,20.1,10.1,21,13,21c5.5,0,10-4.5,10-10S18.5,3,13,3z"></path>
                </svg>
                <h3>暂无历史记录</h3>
                <p>${searchQuery ? '没有找到匹配的记录' : '您还没有保存任何占卜记录'}</p>
                ${!searchQuery ? '<button class="btn btn-primary" onclick="document.querySelector(\'[data-section=divination]\').click()">开始占卜</button>' : ''}
            </div>
        `;
    }

    // 创建历史记录项
    function createHistoryItem(record) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const changingText = record.changingLinesCount > 0
            ? `<span class="changing-indicator">${record.changingLinesCount}变</span>`
            : '';

        historyItem.innerHTML = `
            <div class="history-item-content">
                <div class="history-date">${record.date}</div>
                <div class="history-item-header">
                    <div class="history-hexagram-name">${record.hexagram.name}</div>
                    <div class="history-unicode">${record.hexagram.unicode || ''}</div>
                </div>
                <div class="history-text">${record.hexagram.explanation}</div>
                ${changingText}
                ${record.notes ? `<div class="history-notes">${record.notes}</div>` : ''}
                <div class="history-actions">
                    <button class="history-action view-action tooltip" data-tooltip="查看详情" aria-label="查看详情">
                        <svg class="icon icon-sm" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path>
                        </svg>
                    </button>
                    <button class="history-action delete-action tooltip" data-tooltip="删除记录" aria-label="删除记录">
                        <svg class="icon icon-sm" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // 绑定事件
        const viewBtn = historyItem.querySelector('.view-action');
        const deleteBtn = historyItem.querySelector('.delete-action');

        viewBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            YizhiApp.getModule('modal')?.show(record.hexagram);
        });

        deleteBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await YizhiApp.confirm.show(
                '确认删除',
                '确定要删除这条历史记录吗？',
                { danger: true }
            );
            if (confirmed) {
                deleteRecord(record.id);
            }
        });

        // 点击整个记录项查看详情
        historyItem.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(record.hexagram);
        });

        return historyItem;
    }

    // 更新统计信息
    function updateStats() {
        try {
            const allRecords = getHistoryRecords();
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());

            const weekRecords = allRecords.filter(record => {
                return new Date(record.date) >= weekStart;
            });

            const changingRecords = allRecords.filter(record => {
                return record.changingLinesCount > 0;
            });

            if (totalRecords) totalRecords.textContent = allRecords.length;
            if (thisWeekRecords) thisWeekRecords.textContent = weekRecords.length;
            if (changingLines) changingLines.textContent = changingRecords.length;
        } catch (error) {
            YizhiApp.errors.handle(error, 'Update Stats');
        }
    }

    // 导出历史记录
    function exportHistory() {
        try {
            const records = getHistoryRecords();
            if (records.length === 0) {
                YizhiApp.getModule('notification')?.show('info', '无数据', '没有历史记录可以导出。');
                return;
            }

            const exportData = {
                exported_at: YizhiApp.utils.formatDate(new Date()),
                version: YizhiApp.config.version,
                total_records: records.length,
                records: records
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `易之历史记录_${YizhiApp.utils.formatDate(new Date(), 'YYYY-MM-DD_HH-mm-ss')}.json`;
            link.click();

            URL.revokeObjectURL(link.href);

            YizhiApp.getModule('notification')?.show('success', '导出成功',
                `已导出 ${records.length} 条历史记录。`);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Export History');
        }
    }

    // 清空历史记录
    async function clearHistory() {
        try {
            const confirmed = await YizhiApp.confirm.show(
                '确认清空',
                '确定要清空所有历史记录吗？此操作不可恢复。',
                { danger: true, okText: '清空全部' }
            );

            if (confirmed) {
                YizhiApp.storage.removeItem(STORAGE_KEY);
                updateHistoryDisplay();
                updateStats();

                YizhiApp.getModule('notification')?.show('success', '清空成功',
                    '所有历史记录已被清空。');
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Clear History');
        }
    }

    return {
        init,
        onActivate,
        addRecord,
        getHistoryRecords,
        deleteRecord,
        exportHistory,
        clearHistory
    };
})();

/**
 * 卦象分析工具模块 - 管理卦象组合分析
 */
const HexagramAnalyzerModule = (function() {
    // 私有变量
    const upperBagua = document.getElementById('upperBagua');
    const lowerBagua = document.getElementById('lowerBagua');
    const combinationResult = document.getElementById('combinationResult');
    const quickComboGrid = document.getElementById('quickComboGrid');

    // 常用组合
    const commonCombinations = [
        { upper: '乾', lower: '乾', name: '乾为天' },
        { upper: '坤', lower: '坤', name: '坤为地' },
        { upper: '坎', lower: '坎', name: '坎为水' },
        { upper: '离', lower: '离', name: '离为火' },
        { upper: '震', lower: '震', name: '震为雷' },
        { upper: '巽', lower: '巽', name: '巽为风' },
        { upper: '艮', lower: '艮', name: '艮为山' },
        { upper: '兑', lower: '兑', name: '兑为泽' }
    ];

    // 初始化
    function init() {
        try {
            bindEvents();
            initQuickCombinations();
        } catch (error) {
            YizhiApp.errors.handle(error, 'Hexagram Analyzer Module Init');
        }
    }

    // 绑定事件
    function bindEvents() {
        upperBagua?.addEventListener('change', analyzeCombination);
        lowerBagua?.addEventListener('change', analyzeCombination);
    }

    // 初始化常用组合
    function initQuickCombinations() {
        if (!quickComboGrid) return;

        const fragment = document.createDocumentFragment();
        commonCombinations.forEach(combo => {
            const comboItem = createQuickComboItem(combo);
            fragment.appendChild(comboItem);
        });

        quickComboGrid.appendChild(fragment);
    }

    // 创建快速组合项
    function createQuickComboItem(combo) {
        const item = document.createElement('div');
        item.className = 'quick-combo-item';

        const upperBaguaData = YizhiApp.getModule('hexagramData')?.getBagua(combo.upper);
        const lowerBaguaData = YizhiApp.getModule('hexagramData')?.getBagua(combo.lower);

        item.innerHTML = `
            <div class="combo-symbols">
                <span class="combo-symbol">${upperBaguaData?.symbol || ''}</span>
                <span class="combo-symbol">${lowerBaguaData?.symbol || ''}</span>
            </div>
            <div class="combo-name">${combo.name}</div>
        `;

        item.addEventListener('click', () => {
            if (upperBagua) upperBagua.value = combo.upper;
            if (lowerBagua) lowerBagua.value = combo.lower;
            analyzeCombination();
        });

        return item;
    }

    // 激活时的操作
    function onActivate() {
        // 重新分析当前组合
        analyzeCombination();
    }

    // 分析卦象组合
    function analyzeCombination() {
        if (!combinationResult) return;

        try {
            const upper = upperBagua?.value;
            const lower = lowerBagua?.value;

            if (!upper || !lower) {
                showEmptyResult();
                return;
            }

            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) {
                showLoadingResult();
                return;
            }

            const hexagram = hexagramDataService.getHexagramByTrigrams(upper, lower);

            if (hexagram) {
                showCombinationResult(upper, lower, hexagram);
            } else {
                showNotFoundResult();
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Analyze Combination');
            showErrorResult();
        }
    }

    // 显示空结果
    function showEmptyResult() {
        combinationResult.innerHTML = `
            <div class="result-placeholder">
                <svg class="placeholder-icon" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4Z"></path>
                </svg>
                <p>选择上下卦以查看组合结果</p>
            </div>
        `;
    }

    // 显示加载结果
    function showLoadingResult() {
        combinationResult.innerHTML = `
            <div class="result-loading">
                <div class="loading-spinner">
                    <div class="taiji-spinner"></div>
                </div>
                <p>正在加载卦象数据...</p>
            </div>
        `;
    }

    // 显示组合结果
    function showCombinationResult(upper, lower, hexagram) {
        const upperBaguaData = YizhiApp.getModule('hexagramData').getBagua(upper);
        const lowerBaguaData = YizhiApp.getModule('hexagramData').getBagua(lower);

        if (!upperBaguaData || !lowerBaguaData) {
            showErrorResult();
            return;
        }

        combinationResult.innerHTML = `
            <div class="combination-formula">
                <div class="formula-part">
                    <div class="combination-symbol">${upperBaguaData.symbol}</div>
                    <div class="symbol-label">${upper}</div>
                </div>
                <span class="operator">+</span>
                <div class="formula-part">
                    <div class="combination-symbol">${lowerBaguaData.symbol}</div>
                    <div class="symbol-label">${lower}</div>
                </div>
                <span class="equals">=</span>
                <div class="result-hexagram">
                    <div class="combination-symbol result-unicode">${hexagram.unicode || ''}</div>
                    <div class="result-info">
                        <div class="result-name">${hexagram.name}</div>
                        <div class="result-explanation">${hexagram.explanation || ''}</div>
                    </div>
                </div>
            </div>
            <div class="combination-details">
                <p class="combination-overview">${hexagram.overview || '暂无详细描述'}</p>
                <button class="btn btn-outline btn-sm view-details-btn">查看详情</button>
            </div>
        `;

        // 添加查看详情按钮事件
        const viewDetailsBtn = combinationResult.querySelector('.view-details-btn');
        viewDetailsBtn?.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });

        // 添加点击整个结果区域查看详情
        const resultHexagram = combinationResult.querySelector('.result-hexagram');
        resultHexagram?.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });
    }

    // 显示未找到结果
    function showNotFoundResult() {
        combinationResult.innerHTML = `
            <div class="result-error">
                <svg class="error-icon" viewBox="0 0 24 24">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"></path>
                </svg>
                <p>未找到对应的卦象组合</p>
            </div>
        `;
    }

    // 显示错误结果
    function showErrorResult() {
        combinationResult.innerHTML = `
            <div class="result-error">
                <svg class="error-icon" viewBox="0 0 24 24">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"></path>
                </svg>
                <p>卦象数据加载失败，请稍后重试</p>
            </div>
        `;
    }

    return {
        init,
        onActivate
    };
})();

/**
 * 知识模块 - 管理八卦知识展示
 */
const KnowledgeModule = (function() {
    // 私有变量
    const baguaGrid = document.getElementById('baguaGrid');
    const featuredHexagrams = document.getElementById('featuredHexagrams');

    // 精选卦象（用于展示）
    const featuredHexagramIds = [1, 2, 11, 12, 63, 64]; // 乾、坤、泰、否、既济、未济

    // 初始化
    function init() {
        try {
            initBaguaKnowledge();

            // 监听卦象数据准备完成事件
            YizhiApp.events.on('hexagram-data:ready', () => {
                initFeaturedHexagrams();
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Knowledge Module Init');
        }
    }

    // 激活时的操作
    function onActivate() {
        // 可以添加激活时的特殊逻辑
    }

    // 初始化八卦知识
    function initBaguaKnowledge() {
        if (!baguaGrid) return;

        try {
            // 等待卦象数据准备就绪
            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) {
                // 如果数据还没准备好，稍后再试
                setTimeout(() => initBaguaKnowledge(), 100);
                return;
            }

            const baguaData = hexagramDataService.getBaguaData();
            const fragment = document.createDocumentFragment();

            for (const [name, data] of Object.entries(baguaData)) {
                const baguaCard = createBaguaCard(name, data);
                fragment.appendChild(baguaCard);
            }

            baguaGrid.innerHTML = '';
            baguaGrid.appendChild(fragment);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Init Bagua Knowledge');
        }
    }

    // 创建八卦卡片
    function createBaguaCard(name, data) {
        const baguaCard = document.createElement('div');
        baguaCard.className = 'bagua-card';

        let propertiesHTML = '';
        const propertyLabels = {
            'nature': '本性',
            'attribute': '特质',
            'direction': '方位',
            'animal': '动物',
            'element': '五行',
            'family': '家人'
        };

        for (const [key, value] of Object.entries(data)) {
            if (key === 'symbol' || key === 'binary') continue;
            const label = propertyLabels[key] || key;
            propertiesHTML += `
                <div class="bagua-property">
                    <span class="property-label">${label}:</span>
                    <span class="property-value">${value}</span>
                </div>
            `;
        }

        baguaCard.innerHTML = `
            <div class="bagua-content">
                <div class="bagua-header">
                    <div class="bagua-symbol">${data.symbol}</div>
                    <div class="bagua-info">
                        <div class="bagua-name">${name}</div>
                        <div class="bagua-nature">${data.nature}</div>
                    </div>
                </div>
                <div class="bagua-properties">
                    ${propertiesHTML}
                </div>
            </div>
        `;

        // 添加点击事件
        baguaCard.addEventListener('click', () => {
            showBaguaDetails(name, data);
        });

        return baguaCard;
    }

    // 显示八卦详情
    function showBaguaDetails(name, data) {
        const modalContent = {
            name: `${name}卦详解`,
            unicode: data.symbol,
            explanation: `${data.nature} - ${data.attribute}`,
            overview: `${name}卦象征${data.nature}，具有${data.attribute}的特质。在八卦系统中，${name}卦代表${data.family}的位置，五行属${data.element}，方位在${data.direction}，对应的动物是${data.animal}。`,
            detail: `
                <div class="bagua-detailed">
                    <h4>卦象结构</h4>
                    <p>二进制：${data.binary}</p>
                    <p>符号：${data.symbol}</p>
                    
                    <h4>象征意义</h4>
                    <p>本性：${data.nature}</p>
                    <p>特质：${data.attribute}</p>
                    
                    <h4>对应关系</h4>
                    <p>方位：${data.direction}</p>
                    <p>五行：${data.element}</p>
                    <p>动物：${data.animal}</p>
                    <p>家人：${data.family}</p>
                </div>
            `
        };

        YizhiApp.getModule('modal')?.show(modalContent);
    }

    // 初始化精选卦象
    function initFeaturedHexagrams() {
        if (!featuredHexagrams) return;

        try {
            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) return;

            const fragment = document.createDocumentFragment();

            featuredHexagramIds.forEach(id => {
                const hexagram = hexagramDataService.getHexagramById(id);
                if (hexagram) {
                    const featuredItem = createFeaturedItem(hexagram);
                    fragment.appendChild(featuredItem);
                }
            });

            featuredHexagrams.innerHTML = '';
            featuredHexagrams.appendChild(fragment);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Init Featured Hexagrams');
        }
    }

    // 创建精选卦象项
    function createFeaturedItem(hexagram) {
        const item = document.createElement('div');
        item.className = 'featured-item';

        item.innerHTML = `
            <div class="featured-symbol">${hexagram.unicode || ''}</div>
            <div class="featured-info">
                <div class="featured-name">${hexagram.name}</div>
                <div class="featured-explanation">${hexagram.explanation}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });

        return item;
    }

    return {
        init,
        onActivate
    };
})();

/**
 * 搜索模块 - 管理卦象搜索功能
 */
const SearchModule = (function() {
    // 私有变量
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const searchTags = document.querySelectorAll('.search-tag');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchResults = document.getElementById('searchResults');
    const searchStats = document.getElementById('searchStats');
    const resultCount = document.getElementById('resultCount');
    const featuredHexagrams = document.getElementById('featuredHexagrams');

    let currentQuery = '';
    let currentCategory = '';
    let searchHistory = [];

    // 初始化
    function init() {
        try {
            initSearchInput();
            initSearchTags();
            initCategoryFilter();
            loadSearchHistory();

            // 监听卦象数据准备完成事件
            YizhiApp.events.on('hexagram-data:ready', () => {
                initFeaturedHexagrams();
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Search Module Init');
        }
    }

    // 初始化搜索输入框
    function initSearchInput() {
        if (!searchInput) return;

        searchInput.addEventListener('input', YizhiApp.utils.debounce((e) => {
            currentQuery = e.target.value.trim();
            updateClearButton();
            handleSearch();
        }, 300));

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });

        searchClear?.addEventListener('click', () => {
            clearSearch();
        });
    }

    // 初始化搜索标签
    function initSearchTags() {
        searchTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const keyword = tag.getAttribute('data-keyword');
                searchInput.value = keyword;
                currentQuery = keyword;
                updateClearButton();
                handleSearch();
                addToSearchHistory(keyword);
            });
        });
    }

    // 初始化分类筛选
    function initCategoryFilter() {
        categoryFilter?.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            handleSearch();
        });
    }

    // 激活时的操作
    function onActivate() {
        searchInput?.focus();
        if (currentQuery) {
            handleSearch();
        }
    }

    // 处理搜索
    function handleSearch() {
        try {
            if (!searchResults) return;

            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) {
                showLoadingResults();
                return;
            }

            if (!currentQuery && !currentCategory) {
                showEmptyResults();
                hideStats();
                return;
            }

            const results = performSearch();
            displayResults(results);
            updateStats(results.length);

            // 添加到搜索历史
            if (currentQuery) {
                addToSearchHistory(currentQuery);
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Handle Search');
            showErrorResults();
        }
    }

    // 执行搜索
    function performSearch() {
        const hexagramDataService = YizhiApp.getModule('hexagramData');
        let results = [];

        if (currentQuery) {
            results = hexagramDataService.searchHexagrams(currentQuery);
        } else {
            results = hexagramDataService.getAllHexagrams();
        }

        // 应用分类筛选
        if (currentCategory) {
            results = results.filter(hexagram => {
                return matchesCategory(hexagram, currentCategory);
            });
        }

        return results;
    }

    // 检查是否匹配分类
    function matchesCategory(hexagram, category) {
        // 简单的分类匹配逻辑，实际应用中可能需要更复杂的规则
        switch (category) {
            case 'fortune':
                return ['吉', '利', '亨', '元'].some(char =>
                    hexagram.explanation.includes(char));
            case 'career':
                return ['进', '升', '行', '动'].some(char =>
                    hexagram.explanation.includes(char));
            case 'relationship':
                return ['和', '合', '交', '比'].some(char =>
                    hexagram.explanation.includes(char));
            default:
                return true;
        }
    }

    // 显示搜索结果
    function displayResults(results) {
        if (results.length === 0) {
            showNoResults();
            return;
        }

        const fragment = document.createDocumentFragment();
        results.forEach(hexagram => {
            const searchItem = createSearchItem(hexagram);
            fragment.appendChild(searchItem);
        });

        searchResults.innerHTML = '';
        searchResults.appendChild(fragment);
    }

    // 创建搜索结果项
    function createSearchItem(hexagram) {
        const searchItem = document.createElement('div');
        searchItem.className = 'search-item';

        // 高亮搜索关键词
        const highlightedName = highlightText(hexagram.name, currentQuery);
        const highlightedExplanation = highlightText(hexagram.explanation, currentQuery);

        searchItem.innerHTML = `
            <div class="search-item-content">
                <div class="search-item-header">
                    <div class="search-item-name">${highlightedName}</div>
                    <div class="search-item-unicode">${hexagram.unicode || ''}</div>
                </div>
                <div class="search-item-explanation">${highlightedExplanation}</div>
                <div class="search-item-meta">
                    <span class="search-item-id">第${hexagram.id}卦</span>
                    ${hexagram.upperTrigram && hexagram.lowerTrigram ? 
                        `<span class="search-item-trigrams">${hexagram.upperTrigram}${hexagram.lowerTrigram}</span>` : ''}
                </div>
            </div>
        `;

        searchItem.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });

        return searchItem;
    }

    // 高亮文本
    function highlightText(text, query) {
        if (!query || !text) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // 显示空结果
    function showEmptyResults() {
        searchResults.innerHTML = `
            <div class="search-placeholder">
                <svg class="placeholder-icon" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                </svg>
                <h3>开始搜索卦象</h3>
                <p>输入卦名、关键词或使用标签来查找相关卦象</p>
            </div>
        `;
    }

    // 显示无结果
    function showNoResults() {
        searchResults.innerHTML = `
            <div class="search-no-results">
                <svg class="no-results-icon" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                </svg>
                <h3>未找到相关卦象</h3>
                <p>尝试使用其他关键词或检查拼写是否正确</p>
                <div class="search-suggestions">
                    <p>建议搜索：</p>
                    <div class="suggestion-tags">
                        <span class="suggestion-tag" onclick="document.getElementById('searchInput').value='乾';document.getElementById('searchInput').dispatchEvent(new Event('input'))">乾</span>
                        <span class="suggestion-tag" onclick="document.getElementById('searchInput').value='坤';document.getElementById('searchInput').dispatchEvent(new Event('input'))">坤</span>
                        <span class="suggestion-tag" onclick="document.getElementById('searchInput').value='吉';document.getElementById('searchInput').dispatchEvent(new Event('input'))">吉</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 显示加载结果
    function showLoadingResults() {
        searchResults.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner">
                    <div class="taiji-spinner"></div>
                </div>
                <p>正在搜索卦象...</p>
            </div>
        `;
    }

    // 显示错误结果
    function showErrorResults() {
        searchResults.innerHTML = `
            <div class="search-error">
                <svg class="error-icon" viewBox="0 0 24 24">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"></path>
                </svg>
                <h3>搜索出现错误</h3>
                <p>请稍后重试或联系技术支持</p>
            </div>
        `;
    }

    // 更新统计信息
    function updateStats(count) {
        if (searchStats) {
            if (count > 0) {
                searchStats.style.display = 'block';
                if (resultCount) {
                    resultCount.textContent = count;
                }
            } else {
                hideStats();
            }
        }
    }

    // 隐藏统计信息
    function hideStats() {
        if (searchStats) {
            searchStats.style.display = 'none';
        }
    }

    // 更新清除按钮
    function updateClearButton() {
        if (searchClear) {
            searchClear.style.display = currentQuery ? 'flex' : 'none';
        }
    }

    // 清除搜索
    function clearSearch() {
        currentQuery = '';
        searchInput.value = '';
        categoryFilter.value = '';
        currentCategory = '';
        updateClearButton();
        showEmptyResults();
        hideStats();
    }

    // 添加到搜索历史
    function addToSearchHistory(query) {
        if (!query || searchHistory.includes(query)) return;

        searchHistory.unshift(query);
        if (searchHistory.length > 10) {
            searchHistory = searchHistory.slice(0, 10);
        }

        saveSearchHistory();
    }

    // 加载搜索历史
    function loadSearchHistory() {
        searchHistory = YizhiApp.storage.getItem('search_history', []);
    }

    // 保存搜索历史
    function saveSearchHistory() {
        YizhiApp.storage.setItem('search_history', searchHistory);
    }

    // 初始化精选卦象
    function initFeaturedHexagrams() {
        if (!featuredHexagrams) return;

        try {
            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) return;

            const featuredIds = [1, 2, 11, 12, 24, 44]; // 经典卦象
            const fragment = document.createDocumentFragment();

            featuredIds.forEach(id => {
                const hexagram = hexagramDataService.getHexagramById(id);
                if (hexagram) {
                    const featuredItem = createFeaturedHexagramItem(hexagram);
                    fragment.appendChild(featuredItem);
                }
            });

            featuredHexagrams.innerHTML = '';
            featuredHexagrams.appendChild(fragment);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Init Featured Hexagrams');
        }
    }

    // 创建精选卦象项
    function createFeaturedHexagramItem(hexagram) {
        const item = document.createElement('div');
        item.className = 'featured-hexagram-item';

        item.innerHTML = `
            <div class="featured-symbol">${hexagram.unicode || ''}</div>
            <div class="featured-info">
                <div class="featured-name">${hexagram.name}</div>
                <div class="featured-explanation">${hexagram.explanation}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });

        return item;
    }

    return {
        init,
        onActivate,
        search: handleSearch,
        clearSearch
    };
})();

/**
 * 模态框模块 - 管理卦象详情模态框
 */
const ModalModule = (function() {
    // 私有变量
    const modal = document.getElementById('hexagramModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const closeModal = document.getElementById('closeModal');
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    const modalShareBtn = document.getElementById('modalShareBtn');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    let currentHexagram = null;
    let isVisible = false;

    // 初始化
    function init() {
        try {
            bindEvents();
            initKeyboardEvents();
        } catch (error) {
            YizhiApp.errors.handle(error, 'Modal Module Init');
        }
    }

    // 绑定事件
    function bindEvents() {
        closeModal?.addEventListener('click', hide);
        modalBackdrop?.addEventListener('click', hide);
        modalSaveBtn?.addEventListener('click', saveCurrentHexagram);
        modalShareBtn?.addEventListener('click', shareCurrentHexagram);

        // 点击模态框内容区域不关闭
        modal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 初始化键盘事件
    function initKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (!isVisible) return;

            switch (e.key) {
                case 'Escape':
                    hide();
                    break;
                case 's':
                case 'S':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        saveCurrentHexagram();
                    }
                    break;
                default:
                    break;
            }
        });
    }

    // 显示模态框
    function show(hexagram) {
        if (!hexagram || !modal) {
            console.warn('Modal: Invalid hexagram or modal element not found');
            return;
        }

        try {
            currentHexagram = hexagram;

            // 显示加载状态
            showLoading();

            // 显示模态框
            modal.style.display = 'flex';
            isVisible = true;

            // 设置标题
            const title = `${hexagram.name || '未知卦象'} · ${hexagram.explanation || ''}`;
            if (modalTitle) {
                modalTitle.textContent = title;
            }

            // 异步加载内容
            setTimeout(() => {
                loadModalContent(hexagram);
            }, 100);

            // 焦点管理
            closeModal?.focus();

            // 禁用背景滚动
            document.body.style.overflow = 'hidden';

        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Modal');
        }
    }

    // 隐藏模态框
    function hide() {
        if (!modal || !isVisible) return;

        try {
            modal.style.display = 'none';
            isVisible = false;
            currentHexagram = null;

            // 恢复背景滚动
            document.body.style.overflow = '';

            // 清空内容
            if (modalContent) {
                modalContent.innerHTML = '';
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Hide Modal');
        }
    }

    // 显示加载状态
    function showLoading() {
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="modal-loading">
                <div class="loading-spinner">
                    <div class="taiji-spinner"></div>
                </div>
                <p>加载卦象信息中...</p>
            </div>
        `;
    }

    // 加载模态框内容
    function loadModalContent(hexagram) {
        if (!modalContent) return;

        try {
            // 处理爻辞
            let linesHTML = '';
            if (hexagram.lines && hexagram.lines.length > 0) {
                hexagram.lines.forEach(line => {
                    const position = line.position || 0;
                    const content = line.content || '暂无爻辞';

                    linesHTML += `
                        <div class="modal-line-reading">
                            <div class="modal-line-position">第${position}爻</div>
                            <p class="modal-line-content">${content}</p>
                        </div>
                    `;
                });
            } else {
                linesHTML = '<p class="modal-no-data">暂无爻辞数据</p>';
            }

            // 获取上下卦信息
            let trigramInfo = '';
            if (hexagram.upperTrigram && hexagram.lowerTrigram) {
                const hexagramDataService = YizhiApp.getModule('hexagramData');
                if (hexagramDataService?.isInitialized) {
                    const upperBagua = hexagramDataService.getBagua(hexagram.upperTrigram);
                    const lowerBagua = hexagramDataService.getBagua(hexagram.lowerTrigram);

                    if (upperBagua && lowerBagua) {
                        trigramInfo = `
                            <div class="modal-trigram-info">
                                <div class="trigram-item">
                                    <span class="trigram-symbol">${upperBagua.symbol}</span>
                                    <span class="trigram-name">上卦: ${hexagram.upperTrigram}</span>
                                    <span class="trigram-nature">${upperBagua.nature}</span>
                                </div>
                                <div class="trigram-item">
                                    <span class="trigram-symbol">${lowerBagua.symbol}</span>
                                    <span class="trigram-name">下卦: ${hexagram.lowerTrigram}</span>
                                    <span class="trigram-nature">${lowerBagua.nature}</span>
                                </div>
                            </div>
                        `;
                    }
                }
            }

            // 获取相关卦象
            let relationsHTML = '';
            if (hexagram.id && YizhiApp.getModule('hexagramData')?.isInitialized) {
                const related = YizhiApp.getModule('hexagramData').getRelatedHexagrams(hexagram.id);

                if (Object.keys(related).length > 0) {
                    const relationTypes = {
                        opposite: '对宫卦',
                        inverse: '综卦',
                        mutual: '互卦'
                    };

                    relationsHTML = '<div class="modal-relations"><h4 class="modal-section-title">相关卦象</h4><div class="modal-relation-items">';

                    for (const [type, relHexagram] of Object.entries(related)) {
                        if (!relHexagram) continue;

                        relationsHTML += `
                            <div class="modal-relation-item" data-hexagram-id="${relHexagram.id}">
                                <div class="relation-symbol">${relHexagram.unicode || ''}</div>
                                <div class="relation-info">
                                    <div class="relation-name">${relHexagram.name || '未知卦象'}</div>
                                    <div class="relation-type">${relationTypes[type] || type}</div>
                                </div>
                            </div>
                        `;
                    }

                    relationsHTML += '</div></div>';
                }
            }

            // 构建完整内容
            modalContent.innerHTML = `
                <div class="modal-hexagram-header">
                    <div class="modal-hexagram-unicode">${hexagram.unicode || ''}</div>
                    <div class="modal-hexagram-info">
                        <h2 class="modal-hexagram-name">${hexagram.name || '未知卦象'}</h2>
                        <p class="modal-hexagram-explanation">${hexagram.explanation || ''}</p>
                    </div>
                </div>

                ${trigramInfo}

                <div class="modal-section">
                    <h3 class="modal-section-title">卦象概述</h3>
                    <p class="modal-section-content">${hexagram.overview || '暂无数据'}</p>
                </div>

                <div class="modal-section">
                    <h3 class="modal-section-title">详细解析</h3>
                    <p class="modal-section-content">${hexagram.detail || '暂无数据'}</p>
                </div>

                <div class="modal-section">
                    <h3 class="modal-section-title">爻辞解读</h3>
                    <div class="modal-lines-content">
                        ${linesHTML}
                    </div>
                </div>

                ${relationsHTML}
            `;

            // 绑定相关卦象点击事件
            bindRelationEvents();

        } catch (error) {
            YizhiApp.errors.handle(error, 'Load Modal Content');
            showErrorContent();
        }
    }

    // 绑定相关卦象事件
    function bindRelationEvents() {
        const relationItems = modalContent?.querySelectorAll('.modal-relation-item');
        relationItems?.forEach(item => {
            item.addEventListener('click', () => {
                const hexagramId = parseInt(item.getAttribute('data-hexagram-id'));
                if (hexagramId) {
                    const hexagramDataService = YizhiApp.getModule('hexagramData');
                    const relatedHexagram = hexagramDataService?.getHexagramById(hexagramId);
                    if (relatedHexagram) {
                        show(relatedHexagram);
                    }
                }
            });
        });
    }

    // 显示错误内容
    function showErrorContent() {
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="modal-error">
                <svg class="error-icon" viewBox="0 0 24 24">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"></path>
                </svg>
                <h3>加载失败</h3>
                <p>无法加载卦象信息，请稍后重试</p>
                <button class="btn btn-primary btn-sm" onclick="location.reload()">刷新页面</button>
            </div>
        `;
    }

    // 保存当前卦象
    function saveCurrentHexagram() {
        if (!currentHexagram) return;

        try {
            // 创建历史记录项
            const historyItem = {
                id: YizhiApp.utils.generateId(),
                date: YizhiApp.utils.formatDate(new Date()),
                hexagram: currentHexagram,
                lines: [], // 模态框中的卦象可能没有具体的爻线信息
                notes: '通过查询保存',
                source: 'modal'
            };

            YizhiApp.getModule('history')?.addRecord(historyItem);
            YizhiApp.getModule('notification')?.show('success', '保存成功',
                `卦象「${currentHexagram.name}」已保存到历史记录。`);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Save Current Hexagram');
        }
    }

    // 分享当前卦象
    function shareCurrentHexagram() {
        if (!currentHexagram) return;

        try {
            const shareText = `${currentHexagram.name} - ${currentHexagram.explanation}\n\n${currentHexagram.overview || ''}`;

            if (navigator.share) {
                // 使用原生分享API
                navigator.share({
                    title: `易之 - ${currentHexagram.name}`,
                    text: shareText,
                    url: window.location.href
                }).then(() => {
                    YizhiApp.getModule('notification')?.show('success', '分享成功', '卦象信息已分享。');
                }).catch((error) => {
                    if (error.name !== 'AbortError') {
                        fallbackShare(shareText);
                    }
                });
            } else {
                // 回退到复制到剪贴板
                fallbackShare(shareText);
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Share Current Hexagram');
        }
    }

    // 回退分享方法
    function fallbackShare(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                YizhiApp.getModule('notification')?.show('success', '复制成功', '卦象信息已复制到剪贴板。');
            }).catch(() => {
                showShareModal(text);
            });
        } else {
            showShareModal(text);
        }
    }

    // 显示分享模态框
    function showShareModal(text) {
        const shareModal = document.createElement('div');
        shareModal.className = 'share-modal';
        shareModal.innerHTML = `
            <div class="share-content">
                <h4>分享卦象</h4>
                <textarea readonly class="share-text">${text}</textarea>
                <div class="share-actions">
                    <button class="btn btn-outline btn-sm" onclick="this.closest('.share-modal').remove()">关闭</button>
                    <button class="btn btn-primary btn-sm" onclick="this.parentElement.previousElementSibling.select();document.execCommand('copy');this.textContent='已复制';setTimeout(()=>this.textContent='复制文本',1000)">复制文本</button>
                </div>
            </div>
        `;

        document.body.appendChild(shareModal);

        setTimeout(() => {
            shareModal.remove();
        }, 10000);
    }

    return {
        init,
        show,
        hide,
        get isVisible() { return isVisible; },
        get currentHexagram() { return currentHexagram; }
    };
})();

/**
 * 帮助模块 - 管理帮助和引导
 */
const HelpModule = (function() {
    // 私有变量
    const helpButton = document.getElementById('helpButton');

    // 帮助内容
    const helpContent = {
        title: '易之使用指南',
        sections: [
            {
                title: '基本操作',
                icon: '🎯',
                items: [
                    '点击"投掷铜钱"按钮，依次形成六爻',
                    '完成六爻后，可以点击"变卦显示"查看变卦',
                    '点击"重新起卦"可以清空当前卦象，重新开始',
                    '点击"保存结果"将当前卦象保存到历史记录中',
                    '使用"导出结果"功能可以将占卜结果保存为文件'
                ]
            },
            {
                title: '卦象解读',
                icon: '📖',
                items: [
                    '卦象形成后，可以查看详细解读',
                    '爻辞解读标签页显示各爻的含义',
                    '变爻特别重要，解读时需重点关注',
                    '相关卦象可以帮助理解当前卦象的关联意义',
                    '点击卦象符号可以查看更详细的信息'
                ]
            },
            {
                title: '其他功能',
                icon: '⚙️',
                items: [
                    '历史记录中可以查看过去的占卜结果',
                    '卦象分析工具可以模拟不同八卦的组合',
                    '八卦知识页面提供易经基础理论',
                    '卦象查询功能可以直接搜索特定卦象',
                    '支持键盘快捷键：Alt+数字切换功能区，Ctrl+K快速搜索'
                ]
            },
            {
                title: '占卜原理',
                icon: '🔮',
                items: [
                    '使用三枚铜钱投掷，正面为阳(3)，反面为阴(2)',
                    '三枚铜钱的组合决定每一爻：6为老阴(变阳)，7为少阳，8为少阴，9为老阳(变阴)',
                    '老阴和老阳为变爻，代表能量转化',
                    '本卦显示当前状态，变卦指示发展趋势',
                    '解卦时要综合考虑卦象、爻辞和变化'
                ]
            }
        ]
    };

    // 初始化
    function init() {
        try {
            bindEvents();
        } catch (error) {
            YizhiApp.errors.handle(error, 'Help Module Init');
        }
    }

    // 绑定事件
    function bindEvents() {
        helpButton?.addEventListener('click', showHelp);
        helpButton?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showHelp();
            }
        });
    }

    // 显示帮助
    function showHelp() {
        try {
            // 创建帮助内容HTML
            let sectionsHTML = '';

            helpContent.sections.forEach(section => {
                let itemsHTML = '';
                section.items.forEach(item => {
                    itemsHTML += `<li class="help-item">${item}</li>`;
                });

                sectionsHTML += `
                    <div class="help-section">
                        <h4 class="help-section-title">
                            <span class="help-section-icon">${section.icon}</span>
                            ${section.title}
                        </h4>
                        <ul class="help-item-list">${itemsHTML}</ul>
                    </div>
                `;
            });

            // 添加快捷键信息
            const shortcutsHTML = `
                <div class="help-section">
                    <h4 class="help-section-title">
                        <span class="help-section-icon">⌨️</span>
                        键盘快捷键
                    </h4>
                    <div class="shortcuts-grid">
                        <div class="shortcut-item">
                            <kbd>Alt + 1-5</kbd>
                            <span>切换功能区</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Ctrl + K</kbd>
                            <span>快速搜索</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>关闭弹窗</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Ctrl + S</kbd>
                            <span>保存当前</span>
                        </div>
                    </div>
                </div>
            `;

            // 创建完整的帮助内容
            const fullContent = `
                <div class="help-content">
                    <div class="help-intro">
                        <h3 class="help-title">${helpContent.title}</h3>
                        <p class="help-description">
                            易之是一个现代化的易经演算系统，融合传统智慧与现代技术，
                            为您提供准确、便捷的占卜体验。以下是详细的使用指南。
                        </p>
                    </div>
                    
                    <div class="help-sections">
                        ${sectionsHTML}
                        ${shortcutsHTML}
                    </div>
                    
                    <div class="help-footer">
                        <p class="help-version">版本：${YizhiApp.config.version}</p>
                        <p class="help-contact">
                            如有问题或建议，欢迎联系我们。
                        </p>
                    </div>
                </div>
            `;

            // 使用模态框显示帮助内容
            const modalContent = {
                name: '使用指南',
                unicode: '?',
                explanation: '易之 V6.2 使用帮助',
                overview: '',
                detail: fullContent
            };

            YizhiApp.getModule('modal')?.show(modalContent);

        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Help');
        }
    }

    // 显示快速提示
    function showQuickTip(message, duration = 3000) {
        try {
            YizhiApp.getModule('notification')?.show('info', '使用提示', message, duration);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Quick Tip');
        }
    }

    // 显示功能介绍
    function showFeatureIntro(feature) {
        try {
            const introMessages = {
                divination: '在这里可以进行传统的三钱占卜，通过投掷铜钱形成卦象，获得人生指导。',
                analyzer: '卦象分析工具让您可以自由组合八卦，探索不同卦象的含义和关系。',
                history: '历史记录保存您的所有占卜结果，方便回顾和分析人生轨迹。',
                knowledge: '八卦知识库提供丰富的易经理论知识，帮助您更好地理解卦象。',
                search: '卦象查询功能让您可以快速搜索特定卦象，获取详细信息。'
            };

            const message = introMessages[feature] || '这是一个强大的功能模块。';
            showQuickTip(message, 5000);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Feature Intro');
        }
    }

    return {
        init,
        showHelp,
        showQuickTip,
        showFeatureIntro
    };
})();