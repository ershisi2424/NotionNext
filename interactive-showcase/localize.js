/* 本地化只修改已渲染的文案节点，保留原站 React 事件、WebGL、路由和键盘处理。 */
(async function localize() {
  'use strict';

  // Keep every tab title free of the original author's name, including
  // metadata applied later by React. Run before waiting for page assets.
  function cleanPageTitle() {
    const cleaned = document.title.replace(/\bSina\s+Gh?olizadeh\b/gi, '')
      .replace(/\bsina-developer\b/gi, '').replace(/\bSina(?:'s)?\b/gi, '')
      .replace(/Case study/gi, '案例详情').split(/\s*[·|]\s*/).map(part => part.trim()).filter(Boolean).join(' · ');
    if (cleaned !== document.title) document.title = cleaned || '欢迎访问二十四调试';
  }
  cleanPageTitle();
  new MutationObserver(cleanPageTitle).observe(document.head, { subtree: true, childList: true, characterData: true });

  // Warm only destinations the visitor points at. Native navigation and the
  // existing image fade stay intact; no overlay or new transition is added.
  const prefetchedCases = new Set();
  function warmCase(event) {
    if (navigator.connection?.saveData || prefetchedCases.size >= 3) return;
    const link = event.target instanceof Element && event.target.closest('a[href]');
    if (!link || link.origin !== location.origin || !link.pathname.startsWith('/works/') || link.pathname === location.pathname || prefetchedCases.has(link.href)) return;
    prefetchedCases.add(link.href);
    const resource = document.createElement('link');
    resource.rel = 'prefetch';
    resource.as = 'document';
    resource.href = link.href;
    document.head.append(resource);
  }
  document.addEventListener('pointerover', warmCase, { passive: true });
  document.addEventListener('focusin', warmCase);

  // Download alongside the page; DOM translation still waits for hydration.
  const dictionaryResponse = fetch('/__zh/messages.tsv').then(async response => {
    if (!response.ok) throw new Error('无法读取简体中文词典');
    return response.text();
  });
  // Attach a handler immediately so a slow page does not report an unhandled rejection.
  dictionaryResponse.catch(() => {});

  let robotAudio = null;
  function isRobotAudioMuted() {
    if (typeof window.__deskGetAudioMuted === 'function') return window.__deskGetAudioMuted();
    try { return window.sessionStorage.getItem('audio:muted') !== '0'; }
    catch { return true; }
  }
  window.addEventListener('desk-audio-muted', (event) => {
    if (!robotAudio) return;
    robotAudio.muted = event.detail.muted;
    if (event.detail.muted) {
      robotAudio.pause();
      robotAudio.currentTime = 0;
    }
  });
  window.addEventListener('desk-robot-audio', () => {
    if (isRobotAudioMuted()) return;
    if (!robotAudio) {
      robotAudio = new Audio('/sounds/robot/yaoyao-lingxian.mp3');
      robotAudio.preload = 'auto';
    }
    robotAudio.pause();
    robotAudio.muted = false;
    robotAudio.currentTime = 0;
    robotAudio.play().catch(error => console.warn('机器人音频播放失败', error));
  });

  // 开发板彩蛋：每累计十次有效点击，再由访客确认是否跳转。
  let esp32BoardClicks = 0;
  let esp32Dialog = null;
  let esp32PreviousFocus = null;
  function closeEsp32Dialog() {
    if (!esp32Dialog) return;
    esp32Dialog.remove();
    esp32Dialog = null;
    window.__esp32DialogOpen = false;
    esp32PreviousFocus?.focus?.({ preventScroll: true });
  }
  window.addEventListener('desk-esp32-position', (event) => {
    if (!esp32Dialog) return;
    const { x, y, visible } = event.detail;
    esp32Dialog.style.visibility = visible ? 'visible' : 'hidden';
    const width = esp32Dialog.offsetWidth;
    const height = esp32Dialog.offsetHeight;
    esp32Dialog.style.left = Math.max(12, Math.min(innerWidth - width - 12, x - width / 2)) + 'px';
    esp32Dialog.style.top = Math.max(12, Math.min(innerHeight - height - 12, y - height - 28)) + 'px';
  });
  window.addEventListener('desk-esp32-click', function onEsp32BoardClick() {
    if (esp32Dialog) return;
    esp32BoardClicks += 1;
    if (esp32BoardClicks < 10) return;
    esp32BoardClicks = 0;
    esp32PreviousFocus = document.activeElement;
    esp32Dialog = document.createElement('section');
    esp32Dialog.dataset.localZh = 'esp32-dialog';
    esp32Dialog.dataset.htmlUi = 'esp32-dialog';
    esp32Dialog.setAttribute('role', 'dialog');
    esp32Dialog.setAttribute('aria-labelledby', 'esp32-dialog-title');
    esp32Dialog.setAttribute('aria-describedby', 'esp32-dialog-description');
    esp32Dialog.innerHTML = '<div class="esp32-dialog-bar"><span>隐藏任务 · ESP32</span><span aria-hidden="true">✦</span></div><div class="esp32-dialog-body"><p class="esp32-dialog-tag">彩蛋已解锁</p><h2 id="esp32-dialog-title">继续探索电路之外</h2><p id="esp32-dialog-description">前往 ESP32 项目收录网站，发现更多有趣的硬件作品？</p><div class="esp32-dialog-actions"><button type="button" data-esp32-cancel>取消</button><button type="button" data-esp32-confirm>确定 <span aria-hidden="true">↗</span></button></div></div>';
    for (const name of ['pointerdown', 'pointerup', 'click', 'wheel']) esp32Dialog.addEventListener(name, event => event.stopPropagation());
    esp32Dialog.querySelector('[data-esp32-cancel]').addEventListener('click', closeEsp32Dialog);
    esp32Dialog.querySelector('[data-esp32-confirm]').addEventListener('click', () => {
      closeEsp32Dialog();
      window.location.assign('https://esp32gallery.com/zh/');
    });
    esp32Dialog.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') closeEsp32Dialog();
      if (event.key === 'Tab') {
        event.preventDefault();
        const buttons = esp32Dialog.querySelectorAll('button');
        (document.activeElement === buttons[0] ? buttons[1] : buttons[0]).focus();
      }
    });
    document.body.append(esp32Dialog);
    window.__esp32DialogOpen = true;
    esp32Dialog.querySelector('[data-esp32-cancel]').focus({ preventScroll: true });
  });
  window.addEventListener('popstate', closeEsp32Dialog);

  // 原站使用 React hydration。先让原页面完成初次加载，再翻译文字。
  if (document.readyState !== 'complete') {
    await new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  }

  const dictionaryText = await dictionaryResponse;
  const dictionary = new Map();
  for (const line of dictionaryText.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('\t');
    if (separator > 0) dictionary.set(line.slice(0, separator).replace(/\\n/g, '\n').trim().replace(/\s+/g, ' '), line.slice(separator + 1).replace(/\\n/g, '\n'));
  }

  // Native payloads already contain Chinese; resolve source keys only for
  // existing context-specific content rules, without rewriting UI identifiers.
  const nativeSourceKeys = new Map();
  for (const [english, chinese] of dictionary) {
    if (!nativeSourceKeys.has(chinese)) nativeSourceKeys.set(chinese, english);
  }
  nativeSourceKeys.set('二十四调试', 'Sina Gholizadeh');
  nativeSourceKeys.set('微信', 'LinkedIn');

  // 属性改写涵盖屏幕阅读器标签和图片说明。URL、id、表单值和游戏控制不受影响。
  const attributes = ['alt', 'aria-label', 'aria-description', 'title', 'placeholder', 'href'];
  const obsStudioUrl = 'https://obsproject.com/';
  const douyinLiveUrl = 'https://streamingtool.douyin.com/';
  const contactEmail = 'ershisigu@qq.com';
  const contactWechat = 'G024ovo';
  const oldEmail = /hi@c-na\.dev/gi;
  const excluded = 'script, style, noscript, svg, canvas, code, textarea, [contenteditable], [data-local-zh]';
  const month = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, June: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

  function translate(value) {
    value = value.replace(oldEmail, contactEmail);
    const key = value.trim().replace(/\s+/g, ' ');
    if (key === '/works/giftbede' || key === '/works/maileroo' || key === '/works/solsta' || key === '/works/wassieverse-canvas' || key === '/works/laelaps') return value;
    let result = dictionary.get(key);
    if (result === undefined) {
      const date = key.match(/^([A-Z][a-z]+) (\d{4})(?: - ([A-Z][a-z]+) (\d{4}))?$/);
      const year = key.match(/^Shipped (\d{4})$/);
      const gallery = key.match(/^Enlarge: (.+)$/);
      const play = key.match(/^Play (Battle Town|Space Intruders|Tetrablox|Chomp-Man|Snake)$/);
      const nav = key.match(/^(Previous|Next) (.+)$/);
      const stackTip = key.match(/^Show (.+) in stack\.app$/);
      const stackNext = key.match(/^(.+)\. Show (.+)$/);
      const copied = key.match(/^Copied (\S+@\S+)$/);
      const itemCount = key.match(/^(\d+) items?$/);
      const terminalMessage = key.match(/^(command not found|no such file or directory|no such file|not a directory|cannot remove system item|cannot download|cannot create|downloading|opened|created):? (.+)$/);
      const usage = key.match(/^usage: (.+)$/);
      const clock = key.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (clock) result = (clock[3].toUpperCase() === 'AM' ? '上午 ' : '下午 ') + clock[1] + ':' + clock[2];
      else if (itemCount) result = itemCount[1] + ' 个项目';
      else if (usage) result = '用法：' + usage[1];
      else if (terminalMessage) {
        const labels = { 'command not found': '找不到命令', 'no such file or directory': '找不到文件或目录', 'no such file': '找不到文件', 'not a directory': '不是目录', 'cannot remove system item': '无法移除系统项目', 'cannot download': '无法下载', 'cannot create': '无法创建', downloading: '正在下载', opened: '已打开', created: '已创建' };
        result = labels[terminalMessage[1]] + '：' + terminalMessage[2];
      } else if (date && month[date[1]] && (!date[3] || month[date[3]])) {
        result = date[2] + ' 年 ' + month[date[1]] + ' 月';
        if (date[3]) result += ' – ' + date[4] + ' 年 ' + month[date[3]] + ' 月';
      } else if (year) result = year[1] + ' 年交付';
      else if (gallery) result = '放大：' + translate(gallery[1]);
      else if (play) result = '开始游戏：' + translate(play[1]);
      else if (nav && dictionary.has(nav[1])) result = dictionary.get(nav[1]) + '：' + nav[2];
      else if (stackTip) result = '在 stack.app 中查看 ' + stackTip[1];
      else if (stackNext) result = stackNext[1] + '。查看 ' + stackNext[2];
      else if (copied) result = '已复制 ' + copied[1];
      else if (key.includes(' · Case study')) result = key.replace(' · Case study', ' · 案例详情');
      else if (key.startsWith('Explore the desk · ')) result = key.replace('Explore the desk', '探索桌面');
    }
    const renameProjects = (copy) => copy.replace(/\bGiftbede\b/gi, '摄影作品集').replace(/\b(?:Campaign Lark|campaignlark\.com)\b/gi, 'OBS Studio').replace(/\b(?:Iconly Pro|Iconly\.pro)\b/gi, 'Douyin Live').replace(/\b(?:Solsta|Solsta\.io)\b/gi, 'Kuaishou live').replace(/\bMaileroo\b(?!\.com)/gi, '声卡调试与音色优化').replace(/\bWassieverse Canvas\b/gi, '室内 · 演播厅搭建').replace(/\bLaelaps\b(?!\.c-na)/gi, '室外 · 大舞台搭建');
    if (result === undefined) return renameProjects(value);
    return value.match(/^\s*/)[0] + renameProjects(result) + value.match(/\s*$/)[0];
  }

  const aboutStackLabels = {
    React: 'OBS',
    'Next.js': 'Douyin',
    TypeScript: 'Kuaishou',
    JavaScript: 'YY',
    'Three.js': 'Studio one',
    WebGL: 'Sony',
    Tailwind: 'Canon',
    Sass: 'iPhone',
    HTML: 'Wechat',
    CSS: 'Taobao',
    'Node.js': 'BMD',
    Electron: 'Ai',
    Cypress: 'Tiktok',
    AWS: 'TCHD',
    Docker: 'Video',
    Webflow: 'ESP32',
  };
  const aboutStackButtons = '#about ul:is([aria-label="Skills"], [aria-label="技术技能"]) button';
  const aboutStackPreview = '#about button:has(> span > canvas)';

  const harmonyVersionClicks = new WeakMap();
  let harmonyVersionTip = null;
  let harmonyVersionTipTimer = null;
  function activateHarmonyVersion(element) {
    const count = (harmonyVersionClicks.get(element) || 0) + 1;
    harmonyVersionClicks.set(element, count);
    if (count >= 10) {
      clearTimeout(harmonyVersionTipTimer);
      harmonyVersionTip?.remove();
      harmonyVersionTip = null;
      harmonyVersionClicks.delete(element);
      window.location.assign('https://consumer.huawei.com/cn/harmonyos-7/');
      return;
    }
    if (!harmonyVersionTip) {
      harmonyVersionTip = document.createElement('div');
      harmonyVersionTip.dataset.localZh = 'harmony-version-tip';
      harmonyVersionTip.setAttribute('role', 'status');
      harmonyVersionTip.setAttribute('aria-live', 'polite');
      document.body.append(harmonyVersionTip);
    }
    harmonyVersionTip.textContent = '连按10次进入开发者选项 · ' + count + '/10';
    const rect = element.getBoundingClientRect();
    const width = harmonyVersionTip.offsetWidth;
    harmonyVersionTip.style.left = Math.max(10, Math.min(innerWidth - width - 10, rect.left + rect.width / 2 - width / 2)) + 'px';
    harmonyVersionTip.style.top = Math.max(10, Math.min(innerHeight - harmonyVersionTip.offsetHeight - 10, rect.bottom + 12)) + 'px';
    clearTimeout(harmonyVersionTipTimer);
    harmonyVersionTipTimer = setTimeout(() => {
      harmonyVersionTip?.remove();
      harmonyVersionTip = null;
    }, 2600);
  }
  document.addEventListener('click', event => {
    const version = event.target instanceof Element && event.target.closest('[data-harmony-version]');
    if (!version) return;
    event.preventDefault();
    event.stopPropagation();
    activateHarmonyVersion(version);
  }, true);
  document.addEventListener('keydown', event => {
    if (event.repeat || !['Enter', ' '].includes(event.key)) return;
    const version = event.target instanceof Element && event.target.closest('[data-harmony-version]');
    if (!version) return;
    event.preventDefault();
    event.stopPropagation();
    activateHarmonyVersion(version);
  }, true);

  function translateElement(element) {
    if (element.closest(excluded)) return;
    if (element.matches('span') && /^(?:System Software 7\.5\.5|系统软件 7\.5\.5|软件系统：Harmonyos-7\.11\.24)$/.test(element.textContent.trim())) {
      if (!element.hasAttribute('data-harmony-version')) {
        element.setAttribute('data-harmony-version', '');
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label', '软件系统：Harmonyos-7.11.24，连按10次进入开发者选项');
      }
    }
    if (element.matches('p') && /^©\s*(?:Sina Gholizadeh|二十四调试),/.test(element.textContent.trim())) {
      element.setAttribute('data-desktop-author-credit', '');
    }
    if (element.matches('a[href*="linkedin.com"], a[href="/#contact-wechat"]')) {
      element.dataset.wechatContact = '';
      if (element.getAttribute('href') !== '/#contact-wechat') element.setAttribute('href', '/#contact-wechat');
      element.removeAttribute('target');
      const label = '微信：' + contactWechat + '，查看联系方式';
      if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
    }
    if (element.matches('article[aria-labelledby="cs-title"]') && location.pathname === '/works/iconly-pro') {
      element.dataset.debugCaseOne = '';
    }
    if (element.matches('article[aria-labelledby="cs-title"]') && location.pathname === '/works/campaign-lark') {
      element.dataset.obsCase = '';
    }
    if (element.matches('article[aria-labelledby="cs-title"]') && location.pathname === '/works/wassieverse-canvas') {
      element.dataset.stageCase = '';
    }
    if (element.matches('article[aria-labelledby="cs-title"]') && location.pathname === '/works/solsta') {
      element.dataset.kuaishouCase = '';
    }
    if (element.matches('article[aria-labelledby="cs-title"]') && location.pathname === '/works/maileroo') {
      element.dataset.audioCase = '';
    }
    if (element.matches('article[aria-labelledby="cs-title"]') && location.pathname === '/works/giftbede') {
      element.dataset.photographyCase = '';
    }
    if (element.matches(aboutStackButtons)) {
      const tooltip = element.getAttribute('title')?.match(/^Show (.+) in stack\.app$/);
      if (tooltip && Object.hasOwn(aboutStackLabels, tooltip[1])) {
        element.setAttribute('title', '在 stack.app 中查看 ' + aboutStackLabels[tooltip[1]]);
      }
    }
    if (element.matches(aboutStackPreview)) {
      const label = element.getAttribute('aria-label')?.match(/^(.+)\. Show (.+)$/);
      if (label && Object.hasOwn(aboutStackLabels, label[1]) && Object.hasOwn(aboutStackLabels, label[2])) {
        element.setAttribute('aria-label', aboutStackLabels[label[1]] + '。查看 ' + aboutStackLabels[label[2]]);
      }
    }
    for (const name of attributes) {
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name);
      const next = name === 'href'
        ? current.replace(/^https:\/\/iconly\.pro\/?$/i, douyinLiveUrl).replace(/^https:\/\/campaignlark\.com\/?$/i, obsStudioUrl).replace(/^https:\/\/solsta\.io\/?$/i, 'https://live.kuaishou.com/live-partner').replace(oldEmail, contactEmail)
        : element.closest('header') && current === 'Sina Gholizadeh' ? '二十四调试' : translate(current);
      if (current !== next) element.setAttribute(name, next);
    }
  }

  const liveServices = {
    'Full-stack architecture': '直播间配置诊断',
    'Frontend development': '美颜与肤色调试',
    'Backend development': '灯光与布景调整',
    'Desktop application development': '相机与采集卡设置',
    'Figma plugin development': '声卡与麦克风调试',
    'API integration': '直播场景与素材配置',
    'Performance optimisation': '推流卡顿排查',
    'Product architecture': '开播前联调与复测',
  };

  function hasProjectHeading(element, titles) {
    for (let scope = element; scope && scope !== document.body; scope = scope.parentElement) {
      const heading = scope.querySelector('h1, h2, h3');
      if (heading?.matches('h1, h3') &&
          titles.includes(heading.textContent.trim())) return true;
      if (heading || scope.matches('main, article, section')) return false;
    }
    return false;
  }

  const outdoorStageCopy = {
    "Laelaps needed more than a traditional marketing site: an immersive experience that communicated the project's personality while staying fast on desktop and mobile. That meant an interactive 3D hero, smooth scroll-driven storytelling, custom visual effects, responsive design, fast loading and rendering, and live Telegram community integration.": "户外舞台从白天到入夜，照度和色温一直在变。不同相机切在一起，肤色和亮度容易跳变。扩声、直播收音和灯光秀也要按同一节目流程走。",
    "I built an interactive landing page centred on a fully animated 3D scene that reacts to scrolling for a cinematic product presentation: importing and optimising the character model, scroll-driven camera and object animations, custom GLSL shaders, a live Telegram feed, cross-device rendering performance, and a fully responsive experience delivered in under three weeks.": "先勘察场地，确定台面、机位和设备位置，再配置灯光与收音。用灰卡和参考机位统一画面，把音乐、灯光提示和导播切换放进同一次彩排。",
    "Interactive 3D hero": "从零规划室外大舞台",
    "animated character, camera transitions, scroll-driven storytelling, real-time rendering": "按场地、表演走位和观众视线确定台面、机位及设备位置。",
    "Scroll animations": "自然光与舞台光配合",
    "smooth scene progression, camera interpolation, object animations, timeline interactions": "分别试白天、日落和夜间的补光，兼顾自然肤色和舞台气氛。",
    "Custom shader effects": "多机位相机色彩统一",
    "GLSL shaders, dynamic visuals, GPU-accelerated rendering, enhanced lighting": "先匹配画面配置和色彩空间，再用灰卡对齐曝光、白平衡和肤色。",
    "Telegram integration": "整体声光同步",
    "live feed, real-time project updates, community activity display": "在节目流程表标出音乐起点、灯光提示和切机点，彩排时逐段核对。",
    "Responsive experience": "灯光秀设计落地",
    "mobile optimisation, adaptive camera, cross-device compatibility": "把灯光场景写入控台，从现场和直播回看两边检查效果。",
    "Scroll-based 3D storytelling": "日落前后的混合光",
    "camera, model animation, and scene transitions synced to scroll position": "为白天、日落和入夜准备设置，检查逆光、背景过亮和肤色偏差。",
    "Custom GLSL shaders": "不同相机的画面对齐",
    "unique visual effects while keeping real-time rendering performance": "用参考机位对照全景和近景，逐台检查亮度与肤色，再验证切机效果。",
    "Performance optimisation": "多光源对肤色的影响",
    "geometry, materials, textures, and rendering tuned for desktop and mobile": "分开调人物面光、舞台氛围光和屏幕亮度，避免彩光溢到人物脸上。",
    "Responsive 3D experience": "声光提示与直播同步",
    "WebGL scene and UI adapted across screen sizes without losing composition": "彩排时核对音乐、灯光和切机点，再检查直播端音画延迟。"
  };
  const outdoorStageServices = {
    "Three.js development": "场地勘察与舞台规划",
    "React frontend development": "布景与灯位设计",
    "WebGL & GLSL shader programming": "自然光与舞台光联调",
    "Scroll animation system": "不同相机色彩统一",
    "Performance optimisation": "现场扩声与直播收音联调",
    "Responsive implementation": "灯光秀编排与控台落地",
    "3D scene integration": "彩排、试播与播出交接"
  };

  function translateText(text) {
    if (!text.parentElement || text.parentElement.closest(excluded)) return;
    const parent = text.parentElement;
    const key = nativeSourceKeys.get(text.data.trim()) ?? text.data.trim();
    let next = translate(text.data);
    if (parent.closest('#about figure') && key === 'sina.pict') next = '二十四';
    if (Object.hasOwn(aboutStackLabels, key) && parent.closest(aboutStackButtons + ', ' + aboutStackPreview)) {
      next = aboutStackLabels[key];
    }
    if (parent.matches('footer > span > span') && key === 'Sina Gholizadeh') next = '二十四直播间专业调试';
    if (parent.matches('footer > span') && key === 'c-na.dev') next = '24';
    if (location.pathname === '/works/giftbede') {
      if (parent.closest('[data-photography-case]') && key === 'giftbe.de') next = 'Sony A7M5 · 重庆城市风光';
      if (parent.matches('#cta-title') && next === '聊聊下一个项目') next = '聊聊你的拍摄需求';
      if (parent.closest('section[aria-labelledby="cta-title"]') && next === '接受线上线下画面、声卡、电脑等专业调试预约') {
        next = '欢迎通过邮件沟通拍摄地点、时间与照片用途。';
      }
    }
    if (location.pathname === '/works/giftbede' && parent.matches('main > header p')) {
      if (key === 'Founder, full-stack') next = '城市风光摄影 · Sony A7M5';
      if (['·', 'June 2026', 'Live'].includes(key)) next = '';
    }
    if (['Founder, full-stack', 'June 2026', '1 month', 'to build and launch'].includes(key)
        && hasProjectHeading(parent, ['Giftbede', '摄影作品集'])
        && !parent.matches('main > header p')) {
      const copy = {
        'Founder, full-stack': '城市风光摄影',
        'June 2026': '重庆',
        '1 month': 'Sony A7M5',
        'to build and launch': '拍摄',
      };
      next = copy[key];
    }
    if (location.pathname === '/works/maileroo') {
      if (parent.closest('[data-audio-case]') && key === 'maileroo.com') next = '声卡调试与音色优化';
      if (parent.matches('main > header p')) {
        if (key === 'Senior front-end developer') next = '直播音频调试';
        if (['·', '2023', 'Shipped 2023'].includes(key)) next = '';
      }
    }
    if (key === 'Senior front-end developer' && hasProjectHeading(parent, ['Maileroo', '声卡调试与音色优化'])) {
      next = '直播音频调试';
    }
    if (location.pathname === '/works/laelaps') {
      const article = parent.closest('article[aria-labelledby="cs-title"]');
      if (article && Object.hasOwn(outdoorStageCopy, key)) next = outdoorStageCopy[key];
      if (article && parent.closest('section[aria-labelledby="role"]') && Object.hasOwn(outdoorStageServices, key)) next = outdoorStageServices[key];
      const headings = { problem: '室外搭建需求', built: '从设计到直播', screens: '搭建案例', hard: '多机位与声光联调', role: '一站服务' };
      const sectionId = parent.id || parent.getAttribute('href')?.slice(1);
      if (article && Object.hasOwn(headings, sectionId)) next = headings[sectionId];
      if (article && key === 'laelaps.c-na.dev') next = '室外 · 大舞台搭建';
      const hero = parent.matches('main > header p');
      if (hero && key === '·') {
        let following = text.nextSibling;
        while (following?.nodeType === Node.COMMENT_NODE) following = following.nextSibling;
        if (following?.textContent === 'Shipped') next = '';
      }
      if (hero || article && parent.closest('aside')) {
        const copy = { 'Graphics engineer, via Piqo Design': '室外直播间从设计到直播一站服务', '2019-2021': '2024-2026', Shipped: hero ? '' : '设计 · 搭建 · 直播', 'Krew Studios, via Piqo Design': '户外演出与直播团队', React: '相机与监看', TypeScript: '舞台灯光与控台', 'Three.js': '收音与直播推流' };
        if (Object.hasOwn(copy, key)) next = copy[key];
      }
    }
    if (['Graphics engineer, via Piqo Design', '2019-2021'].includes(key) &&
        hasProjectHeading(parent, ['Laelaps', '室外 · 大舞台搭建'])) {
      next = key === '2019-2021' ? '2024-2026' : '室外直播间从设计到直播一站服务';
    }
    if (location.pathname === '/works/wassieverse-canvas') {
      if (parent.closest('[data-stage-case]') && key === 'wassieverse.c-na.dev') next = '室内 · 演播厅搭建';
      if (parent.matches('main > header p') || parent.closest('[data-stage-case] aside, [data-stage-case] #role + ul')) {
        const copy = {
          'Graphics engineer, via Piqo Design': '舞台与灯光联调',
          '2019-2021': '2023-2026',
          'Krew Studios, via Piqo Design': '舞台与直播场景',
          Shipped: '场景联调',
          React: '舞台灯光',
          TypeScript: '人物柔光',
          'Three.js': '机位监看',
          'React Three Fiber': 'OBS Studio',
        };
        if (Object.hasOwn(copy, key)) next = copy[key];
      }
      if (parent.closest('[data-stage-case] section[aria-labelledby="role"]') && key === 'Performance optimisation') next = '专属直播间画面调试';
      const stageHeadings = { problem: '预算与搭建需求', built: '高性价比搭建方案', hard: '灯光光源把控', role: '我们的搭建优势' };
      const sectionId = parent.id || parent.getAttribute('href')?.slice(1);
      if (Object.hasOwn(stageHeadings, sectionId)) next = stageHeadings[sectionId];
      if (parent.matches('#screens, a[href="#screens"]')) next = '舞台效果图';
    }
    if (location.pathname === '/explore') {
      const stageWindow = parent.closest('div.mx-auto.flex');
      if (stageWindow?.querySelector('h1')?.textContent.trim() === '室内 · 演播厅搭建' && parent.matches('h2')) {
        const headings = { 'My Role': '我们的搭建优势', Problem: '预算与搭建需求', Solution: '高性价比搭建方案', 'Key Features': '方案怎么落地', Challenges: '灯光光源把控' };
        if (Object.hasOwn(headings, key)) next = headings[key];
      }
      if (parent.matches('#screens, a[href="#screens"]')) next = '舞台效果图';
    }
    if (['Graphics engineer, via Piqo Design', '2019-2021'].includes(key) &&
        hasProjectHeading(parent, ['Wassieverse Canvas', '室内 · 演播厅搭建'])) {
      next = key === '2019-2021' ? (location.pathname === '/works/wassieverse-canvas' ? '2023-2026' : '演出与直播 · 2023-2026') : '舞台与灯光联调';
    }
    if (location.pathname === '/works/solsta') {
      const copy = {
        'Senior front-end developer, freelance': '直播画面调试',
        '2025': '竖屏直播',
        'Shipped 2025': '舞台与人像',
        'Solsta': '舞台表演与单人主播',
        'solsta.io': 'Kuaishou live',
        'Webflow': '快手直播伴侣',
        'Frontend architecture': '直播伴侣场景配置',
      };
      if (Object.hasOwn(copy, key) && (parent.matches('main > header p') || parent.closest('article aside, section[aria-labelledby="role"]'))) {
        next = key === 'solsta.io' && parent.closest('a') ? '快手直播伴侣官网' : copy[key];
      }
      if (parent.closest('article figure') && key === 'solsta.io') next = 'Kuaishou live';
    }
    if (key === 'Senior front-end developer, freelance' && hasProjectHeading(parent, ['Solsta', 'Kuaishou live'])) {
      next = '直播画面调试';
    }
    if (parent.matches('#contact [role="tab"][id$="-tab-1"]') && key === 'LinkedIn') next = '微信';
    if (parent.closest('[data-wechat-contact]')) {
      if (['LinkedIn', 'Open LinkedIn', '领英', '打开领英', '微信'].includes(key)) next = '微信：' + contactWechat;
      if (key === '(opens in a new tab)') next = '';
    }
    const obsCase = parent.closest('[data-obs-case]');
    if (obsCase || parent.closest('[data-debug-case-one]')) {
      const sectionTitle = parent.parentElement.querySelector(':scope > h2');
      const sectionNumber = { screens: '01', hard: '02', role: '03' }[sectionTitle?.id];
      if (parent.matches('span') && /^0[345]$/.test(key) && sectionNumber) next = sectionNumber;
      if (key === 'My role') next = '我能为你的直播间做什么';
      if (obsCase && key === 'Performance optimisation' && parent.closest('section[aria-labelledby="role"]')) {
        next = '滤镜顺序与性能排查';
      }
      if (obsCase && key === 'Email designer' && parent.closest('section[aria-labelledby="hard"]')) {
        next = '多场景色彩一致性';
      }
      if (parent.closest('section[aria-labelledby="role"]') && Object.hasOwn(liveServices, key)) {
        next = liveServices[key];
      }
      if (parent.matches('#screens, a[href="#screens"]')) next = '效果截图';
    }
    if (['Full-stack engineer, via Piqo Design', '2019-2021', 'Shipped 2021', '300,000+', 'users', '·'].includes(key)
        && hasProjectHeading(parent, ['Iconly Pro', 'Douyin Live'])) {
      const hero = parent.matches('main > header p');
      const copy = {
        'Full-stack engineer, via Piqo Design': '美颜调试师',
        '2019-2021': '2024–2026',
        'Shipped 2021': hero ? '' : '2024–2026',
        '300,000+': '直播画面',
        users: '调试',
        '·': hero ? ' ' : text.data,
      };
      next = copy[key];
    }
    if (['Senior front-end developer, freelance', 'Shipped 2026', '·'].includes(key)
        && hasProjectHeading(parent, ['Campaign Lark', 'OBS Studio'])) {
      if (key === 'Senior front-end developer, freelance') next = 'OBS 直播调试师';
      else if (parent.matches('main > header p')) next = key === '·' ? ' ' : '';
    }
    if (key === 'campaignlark.com' && parent.closest('a[href="' + obsStudioUrl + '"]')) {
      next = 'OBS Studio 官网';
    }
    const officialLink = parent.closest('a[href="' + douyinLiveUrl + '"]');
    if (officialLink && key === 'iconly.pro') next = '抖音直播伴侣官网';
    if (parent.id === 'hero-name' && key === 'Sina Gholizadeh') next = '二十四直播调试';
    if (parent.closest('header') && key === 'SG') next = '24';
    if (parent.closest('header') && key === 'Sina Gholizadeh') next = '二十四调试';
    if (parent.matches('#contact > p.flex')) {
      if (key === 'Available for full-time and freelance work') next = '接受兼职-远程-线下-线上等服务';
      else if (key === '·' || key === 'Remote · Open to relocation') next = '';
    }
    if (next !== text.data) text.data = next;
  }

  // 原按钮的 React 回调持有原站邮箱，接管这个按钮的复制动作。
  document.addEventListener('click', async (event) => {
    const button = event.target instanceof Element && event.target.closest('#contact button');
    if (!button || !['复制', 'Copy'].includes(button.textContent.trim())) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    let message = '复制失败，请手动复制 ' + contactEmail;
    try {
      await navigator.clipboard.writeText(contactEmail);
      message = '已复制 ' + contactEmail;
    } catch (error) {
      console.warn('[联系方式] 剪贴板不可用', error);
    }
    let feedback = document.querySelector('[data-local-zh="contact-feedback"]');
    if (!feedback) {
      feedback = document.createElement('span');
      feedback.dataset.localZh = 'contact-feedback';
      feedback.setAttribute('role', 'status');
      button.after(feedback);
    }
    feedback.textContent = message;
  }, true);

  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      translateText(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(excluded)) return;
    translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches(excluded)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) translateText(node);
      else translateElement(node);
    }
  }

  // 独立街机由 WebGL 绘制拉丁像素字形，中文说明采用可折叠网页面板。
  const games = {
    '/tank': ['坦克小镇', '方向键或 WASD 移动，空格开火。菜单用方向键选择战役或生存，空格确认。'],
    '/space-invader': ['太空入侵者', '空格开始或开火，左右方向键或 A、D 移动。'],
    '/tetris': ['叠叠方块', '空格开始或快速落下，左右移动，上键旋转，下键加速。'],
    '/pac-man': ['迷宫吃豆', '空格开始，方向键或 WASD 移动，吃完豆子并躲开幽灵。'],
    '/snake': ['贪吃蛇', '空格开始或继续，方向键或 WASD 移动，Esc 暂停。']
  };

  function syncGameGuide() {
    const game = games[location.pathname];
    const oldGuide = document.querySelector('[data-local-zh="guide"]');
    if (!game) {
      if (oldGuide) oldGuide.remove();
      return;
    }
    if (oldGuide?.dataset.gamePath === location.pathname) return;
    if (oldGuide) oldGuide.remove();
    const guide = document.createElement('details');
    guide.dataset.localZh = 'guide';
    guide.dataset.gamePath = location.pathname;
    document.title = game[0] + ' · 二十四调试网页';
    const summary = document.createElement('summary');
    summary.textContent = game[0] + ' · 中文操作';
    const instructions = document.createElement('p');
    instructions.textContent = game[1];
    const back = document.createElement('a');
    back.href = '/#playground';
    back.textContent = '返回游戏空间';
    guide.append(summary, instructions, back);
    document.body.append(guide);
    // 展开说明后把键盘焦点还给游戏，但保留键盘用户对返回链接的访问。
    guide.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !guide.open) return;
      event.stopPropagation();
      guide.open = false;
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
  }

  document.documentElement.lang = 'zh-CN';

  const blogLinks = new Map();
  const entryAnimationSources = new WeakMap();

  function syncEntryHints() {
    for (const [source, link] of blogLinks) {
      const shell = link.closest('[data-local-zh="blog-link-shell"]');
      const hint = shell?.querySelector('.debug-entry-hint');
      if (!hint) continue;
      // 原探索按钮每次被提醒时会重建动画容器；调试入口同步重建，重播同一动画。
      const animationSource = source.parentElement;
      if (entryAnimationSources.get(link) !== animationSource) {
        const oldMotion = shell.querySelector('[data-entry-motion]');
        const motion = document.createElement('div');
        motion.dataset.entryMotion = '';
        motion.className = animationSource.className;
        motion.append(link);
        shell.prepend(motion);
        oldMotion?.remove();
        entryAnimationSources.set(link, animationSource);
      }
      const row = source.parentElement?.parentElement;
      const original = row?.querySelector('p[role="status"]');
      hint.hidden = !original;
      if (original) {
        original.dataset.entryHint = '';
        hint.dataset.entryHint = '';
        if (hint.className !== original.className + ' debug-entry-hint') hint.className = original.className + ' debug-entry-hint';
      }
    }
  }

  // 跟随原按钮的容器和断点。桌面场景重建按钮后，重新挂载对应入口。
  function syncBlogLink() {
    const hero = document.getElementById('hero-name')?.closest('section');
    const url = document.querySelector('meta[name="notion-blog-url"]')?.content;
    const sources = location.pathname === '/' && url
      ? [...document.querySelectorAll('header a[href="/explore"]'),
        ...(hero ? [...hero.querySelectorAll('a[href="/explore"], button, span.md\\:hidden > a[href="#work"]')].filter(node => node.matches('a') || /探索桌面|Explore (?:the )?desk/i.test(node.textContent)) : [])]
      : [];
    for (const [source, link] of blogLinks) {
      if (!sources.includes(source) || !link.isConnected) {
        const wrapper = link.closest('[data-local-zh="blog-link-shell"]');
        (wrapper ?? link).remove();
        blogLinks.delete(source);
      }
    }
    for (const source of sources) {
      if (blogLinks.has(source)) continue;
      const link = document.createElement('a');
      link.className = source.className;
      for (const child of source.childNodes) link.append(child.cloneNode(true));
      link.dataset.localZh = 'blog-link';
      link.href = url;
      link.removeAttribute('aria-label');
      for (const node of [...link.childNodes]) {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
      }
      const icon = link.querySelector('svg');
      if (!icon) {
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrow.setAttribute('viewBox', '0 0 24 24');
        arrow.setAttribute('width', '16');
        arrow.setAttribute('height', '16');
        arrow.setAttribute('fill', 'currentColor');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.setAttribute('class', 'shrink-0 [shape-rendering:crispEdges]');
        const path = document.createElementNS(arrow.namespaceURI, 'path');
        path.setAttribute('d', 'M12 7H13V9H15V11H3V13H15V15H13V17H12V19H13V17H15V15H17V13H19V11H17V9H15V7H13V5H12V7Z');
        arrow.append(path);
        link.append(arrow);
      }
      link.prepend('开始调试');
      if (source.getAttribute('href') === '#work') {
        source.parentElement.dataset.mobileActions = '';
        link.dataset.mobileEntry = '';
        source.before(link);
      } else {
        const wrapper = document.createElement('div');
        wrapper.dataset.localZh = 'blog-link-shell';
        if (hero?.contains(source)) wrapper.dataset.entryBreakpoint = 'desktop';
        wrapper.append(link);
        if (hero?.contains(source)) {
          const row = source.parentElement.parentElement;
          row.parentElement.dataset.heroActions = '';
          const hint = document.createElement('span');
          hint.className = 'debug-entry-hint';
          hint.textContent = '← 点击进入调试';
          hint.hidden = true;
          wrapper.append(hint);
          row.after(wrapper);
        } else {
          source.parentElement.after(wrapper);
        }
      }
      blogLinks.set(source, link);
    }
    syncEntryHints();
  }

  function syncPhotographyGallery() {
    const gallery = document.querySelector('[data-local-zh="photography-gallery"]');
    if (location.pathname !== '/works/giftbede') {
      gallery?.remove();
      return;
    }
    const article = document.querySelector('[data-photography-case]');
    const screens = article?.querySelector('section[aria-labelledby="screens"]');
    if (!screens || gallery) return;

    const chapters = [
      ['photography-works', '摄影作品'],
      ['photography-process', '拍摄与调色'],
      ['photography-services', '也欢迎找我互免约拍'],
    ];
    function createChapter(index) {
      const [id, title] = chapters[index];
      const section = document.createElement('section');
      section.dataset.localZh = index === 0 ? 'photography-gallery' : 'photography-chapter';
      section.className = 'photography-chapter';
      section.setAttribute('aria-labelledby', id);
      const number = document.createElement('span');
      number.className = 'font-display text-label font-bold text-accent-ink';
      number.textContent = String(index + 1).padStart(2, '0');
      const heading = document.createElement('h2');
      heading.id = id;
      heading.className = 'm-0 font-display text-2xl font-bold md:text-[30px]';
      heading.textContent = title;
      section.append(number, heading);
      return section;
    }
    const section = createChapter(0);
    const grid = document.createElement('div');
    grid.className = 'photography-grid';
    const photos = [
      ['dusk-skyline', 2200, 1448, '暮色下亮起灯光的重庆天际线'],
      ['river-light-trails', 2200, 1503, '重庆两江交汇处的城市夜景与船只光轨'],
      ['golden-river', 1247, 2200, '金色江面旁的盘旋道路与黄色出租车'],
      ['riverside-towers', 1633, 2200, '隔江望向红色楼群，近处是秋叶与枝干'],
    ];
    for (const [name, width, height, description] of photos) {
      const frame = document.createElement('figure');
      frame.className = 'm-0 border border-black bg-platinum';
      const titleBar = document.createElement('div');
      titleBar.className = 'flex h-[22px] items-center gap-1.5 border-b border-black bg-platinum px-1.5';
      titleBar.setAttribute('aria-hidden', 'true');
      const square = document.createElement('span');
      square.className = 'size-[11px] border border-black bg-paper';
      const stripes = document.createElement('span');
      stripes.className = 'h-[11px] grow bg-[repeating-linear-gradient(to_bottom,#000_0_1px,transparent_1px_2px)]';
      titleBar.append(square, stripes, square.cloneNode());
      const mount = document.createElement('div');
      mount.className = 'photography-mount';
      const image = document.createElement('img');
      image.src = '/__zh/photography/' + name + '.webp';
      image.width = width;
      image.height = height;
      image.alt = description;
      image.loading = 'lazy';
      image.decoding = 'async';
      const fullSize = document.createElement('a');
      fullSize.href = image.src;
      fullSize.target = '_blank';
      fullSize.rel = 'noopener noreferrer';
      fullSize.setAttribute('aria-label', '查看大图：' + description + '（在新标签页打开）');
      fullSize.append(image);
      mount.append(fullSize);
      frame.append(titleBar, mount);
      grid.append(frame);
    }
    section.append(grid);
    const process = createChapter(1);
    const workflow = document.createElement('ul');
    workflow.className = 'photography-workflow';
    for (const line of [
      '每一次的瞬间都是不可复制',
      '每一下快门都是记录时间',
      '每一次调色都是对内心的表达',
    ]) {
      const item = document.createElement('li');
      item.textContent = line;
      workflow.append(item);
    }
    process.append(workflow);
    const services = createChapter(2);
    services.querySelector('h2').classList.add('photography-invite');
    screens.before(section, process, services);
    const summary = screens.parentElement.querySelector(':scope > p');
    summary?.classList.add('photography-gear');

    const aside = article.querySelector('aside');
    if (!aside) return;
    const panel = document.createElement('div');
    panel.dataset.localZh = 'photography-sidebar';
    panel.className = 'border border-black bg-paper shadow-2';
    const title = document.createElement('h2');
    title.className = 'm-0 border-b border-black bg-platinum px-4 py-2 font-display font-bold';
    title.textContent = '拍摄信息';
    const details = document.createElement('p');
    details.className = 'm-0 px-4 py-3';
    details.textContent = 'A7M5 A7C2 24-70GM2 16-35GM2 器材拍摄';
    const toc = document.createElement('nav');
    toc.setAttribute('aria-label', '本页目录');
    toc.className = 'photography-toc';
    for (const [id, label] of chapters) {
      const link = document.createElement('a');
      link.href = '#' + id;
      link.textContent = label;
      toc.append(link);
    }
    panel.append(title, details, toc);
    aside.append(panel);
  }

  function syncPhotographyFloppy() {
    if (location.pathname !== '/explore') return;
    const title = [...document.querySelectorAll('h1')].find(
      (heading) => heading.textContent.trim() === '摄影作品集'
    );
    const project = title?.closest('div.mx-auto.flex');
    if (!project || project.querySelector('[data-local-zh="floppy-photos"]')) return;

    const sections = [...project.querySelectorAll(':scope > section')];
    const findSection = (...titles) => sections.find(
      (section) => titles.includes(section.querySelector('h2')?.textContent.trim())
    );
    const firstPhoto = findSection('Problem', '调试需求');
    if (!firstPhoto) return;

    const gallery = document.createElement('section');
    gallery.dataset.localZh = 'floppy-photos';
    gallery.className = firstPhoto.className;
    const photos = [
      ['dusk-skyline', '风光新手村', '绝美蓝调'],
      ['river-light-trails', '重庆两江交汇处', '船过江心，留下一道亮线。'],
      ['golden-river', '重庆江畔', '一辆黄色出租车拐进弯道。'],
      ['riverside-towers', '重庆对岸江边', '隔着几片秋叶，看对岸的红楼。'],
    ];
    for (const [name, place, description] of photos) {
      const row = document.createElement('figure');
      row.className = 'floppy-photo';
      const caption = document.createElement('figcaption');
      const location = document.createElement('h2');
      location.textContent = '地址：' + place;
      const copy = document.createElement('p');
      copy.textContent = description;
      caption.append(location, copy);
      const image = document.createElement('img');
      image.src = '/__zh/photography/' + name + '.webp';
      image.alt = place + '。' + description;
      image.decoding = 'async';
      row.append(caption, image);
      gallery.append(row);
    }

    const equipment = findSection('Tech Stack', '技术栈');
    if (equipment) equipment.querySelector('h2').textContent = '拍摄器材';
    const experience = findSection('Key Features', '服务场景');
    if (experience) {
      experience.querySelector('h2').textContent = '摄影经验';
      const item = experience.querySelector('li');
      if (item) item.textContent = '丰富的人像风光摄影经验';
    }
    for (const section of [firstPhoto, findSection('Solution', '调试方案'),
      findSection('Challenges', '技术难点'), findSection('Live Demo', '相关官网')]) {
      if (section) section.hidden = true;
    }
    firstPhoto.before(gallery);
  }

  const audioDevices = [
    ['艾肯 iCON 声卡', 'icon-cube.webp', '先核对麦克风接口与输入增益，给讲话和演唱留出峰值余量，再分别检查耳返和直播电平。'],
    ['IXI MEGA 路由', 'sign-in.webp', '按话筒、软件伴奏、耳机和推流输入逐项检查信号，避免同一路声音被 OBS 重复采集。'],
    ['RME Babyface Pro', 'collaborators.webp', '在 TotalMix FX 中分别核对硬件输入、软件回放和输出子混音，让耳机监听与推流各走对应通道。'],
  ];
  const audioChecks = [
    '输入电平：先用正常讲话和高声演唱试音，排查削波、底噪和接线问题。',
    '监听与推流：分别检查耳机、伴奏、连麦和 OBS 采集，避免回声和重复收音。',
    '人声音色：用均衡处理浑浊或刺耳频段，按需要加入去齿音和压缩，再通过录音与试播回听对比。',
  ];

  function syncAudioCase() {
    const article = document.querySelector('[data-audio-case]');
    const windows = location.pathname === '/explore'
      ? [...document.querySelectorAll('h1')].filter((h) => ['声卡调试', '声卡调试与音色优化'].includes(h.textContent.trim()))
        .map((h) => h.closest('div.mx-auto.flex')).filter(Boolean)
      : [];
    const projects = article ? [article] : windows;
    for (const project of projects) {
      if (project.querySelector('[data-local-zh="audio-devices"]')) continue;
      const sections = [...project.querySelectorAll(article ? 'section[aria-labelledby]' : ':scope > section')];
      const anchor = article ? sections.find((section) => section.getAttribute('aria-labelledby') === 'screens')
        : sections.find((section) => ['Problem', '调试需求'].includes(section.querySelector('h2')?.textContent.trim()));
      if (!anchor) continue;

      const chapter = (id, heading, number) => {
        const section = document.createElement('section');
        section.dataset.localZh = id;
        section.className = article ? 'audio-case-chapter' : anchor.className;
        const h2 = document.createElement('h2');
        h2.id = id;
        h2.textContent = (article ? number + ' ' : '') + heading;
        section.append(h2);
        return section;
      };
      const devices = chapter('audio-devices', '声卡与调试实例', '01');
      for (const [title, file, copy] of audioDevices) {
        const figure = document.createElement('figure');
        figure.className = 'floppy-photo audio-device';
        const caption = document.createElement('figcaption');
        const name = document.createElement('h3');
        name.textContent = title;
        const description = document.createElement('p');
        description.textContent = copy;
        caption.append(name, description);
        const image = document.createElement('img');
        image.src = '/projects/maileroo/' + file;
        image.alt = title;
        const preview = document.createElement('a');
        preview.href = image.src;
        preview.target = '_blank';
        preview.rel = 'noopener noreferrer';
        preview.setAttribute('aria-label', '查看大图：' + title);
        preview.append(image);
        figure.append(caption, preview);
        devices.append(figure);
      }
      anchor.before(devices);
      if (article) {
        const checks = chapter('audio-checks', '声卡调试难点', '02');
        const services = chapter('audio-services', '我能为你的直播间做什么', '03');
        for (const [section, items] of [[checks, audioChecks], [services, [
          '调试麦克风增益、耳返、伴奏和推流路由。',
          '按讲话、唱歌或连麦场景调整人声均衡与动态。',
          '试播回听，并记录可复用的设置和开播前检查步骤。',
        ]]]) {
          const list = document.createElement('ul');
          list.className = 'photography-workflow';
          for (const item of items) {
            const row = document.createElement('li');
            row.textContent = item;
            list.append(row);
          }
          section.append(list);
        }
        devices.after(checks, services);
        const aside = article.querySelector('aside');
        if (!aside) continue;
        const toc = document.createElement('nav');
        toc.dataset.localZh = 'audio-toc';
        toc.className = 'photography-toc audio-case-toc';
        toc.setAttribute('aria-label', '本页目录');
        for (const section of [devices, checks, services]) {
          const heading = section.querySelector('h2');
          const link = document.createElement('a');
          link.href = '#' + heading.id;
          link.textContent = heading.textContent;
          toc.append(link);
        }
        aside.append(toc);
      } else {
        for (const section of sections) {
          const heading = section.querySelector('h2');
          const text = heading?.textContent.trim();
          if (['Problem', '调试需求', 'Solution', '调试方案', 'Key Features', '服务场景', 'Live Demo', '相关官网'].includes(text)) {
            section.hidden = true;
          }
          if (['Tech Stack', '技术栈'].includes(text)) heading.textContent = '调试设备';
        }
      }
    }
  }

  function syncLiveCasePanel() {
    const article = document.querySelector('[data-debug-case-one], [data-obs-case]');
    const obsCase = article?.hasAttribute('data-obs-case');
    const url = obsCase ? obsStudioUrl : douyinLiveUrl;
    const link = article?.querySelector('a[href="' + url + '"]');
    const panel = link?.parentElement.parentElement;
    const metadata = panel?.querySelector(':scope > dl');
    if (!metadata || panel.querySelector('[data-local-zh="live-challenges"]')) return;

    const section = document.createElement('section');
    section.dataset.localZh = 'live-challenges';
    const heading = document.createElement('h2');
    heading.textContent = obsCase ? 'OBS 插件调试难点' : '直播调试难点';
    const list = document.createElement('dl');
    const challenges = obsCase ? [
      ['亮度校正器', '用遮罩限定亮度调整区域，检查边缘过渡和高光细节。'],
      ['OBS 调色器', '用曝光、对比度、LUT 和预设统一机位色彩，切场后复核肤色。'],
      ['着色器特效滤镜', '检查额外像素与滤镜顺序，在试播中验证边缘和渲染负载。'],
    ] : [
      ['画面一致性', '统一相机与采集卡的分辨率、帧率和色彩范围，用预览与手机端回看来核对偏色和裁切。'],
      ['多路信号与切场', '按机位和用途命名信号源，检查竖屏安全区，并预演主信号中断时的备用场景。'],
      ['推流稳定性', '试播时同时观察渲染、编码和网络丢帧，按瓶颈调整素材复杂度、帧率或码率。'],
    ];
    for (const [title, description] of challenges) {
      const term = document.createElement('dt');
      term.textContent = title;
      const detail = document.createElement('dd');
      detail.textContent = description;
      list.append(term, detail);
    }
    section.append(heading, list);
    panel.dataset.liveCasePanel = '';
    metadata.before(section);
  }

  let openWechatOnSync = location.hash === '#contact-wechat';

  function openWechatContact() {
    const tab = document.querySelector('#contact [role="tab"][id$="-tab-1"]');
    if (!openWechatOnSync || !tab) return;
    openWechatOnSync = false;
    tab.click();
    requestAnimationFrame(() => {
      const account = document.getElementById('wechat-account');
      (document.getElementById('contact-wechat') ?? document.getElementById('contact'))?.scrollIntoView({ block: 'center' });
      account?.focus({ preventScroll: true });
    });
  }

  window.addEventListener('hashchange', () => {
    openWechatOnSync = location.hash === '#contact-wechat';
    openWechatContact();
  });
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || location.pathname !== '/') return;
    const link = event.target instanceof Element && event.target.closest('[data-wechat-contact]');
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (location.hash !== '#contact-wechat') history.pushState(history.state, '', location.pathname + location.search + '#contact-wechat');
    openWechatOnSync = true;
    openWechatContact();
  }, true);

  function syncWechatPlaceholder() {
    const panel = document.querySelector('#contact [role="tabpanel"] > div:nth-child(2)');
    if (!panel || panel.querySelector('[data-local-zh="wechat-card"]')) return;
    panel.querySelector('[data-local-zh="wechat-placeholder"]')?.remove();
    const card = document.createElement('div');
    card.dataset.localZh = 'wechat-card';
    card.id = 'contact-wechat';
    card.className = 'wechat-contact-card';
    const details = document.createElement('div');
    details.className = 'wechat-contact-details';
    const label = document.createElement('span');
    label.className = 'text-xs leading-[18px] text-ink-2';
    label.textContent = '微信联系我';
    const account = document.createElement('span');
    account.id = 'wechat-account';
    account.tabIndex = -1;
    account.className = 'wechat-contact-account';
    account.textContent = contactWechat;
    const actions = document.createElement('div');
    actions.className = 'flex flex-wrap items-center gap-2.5';
    const template = document.querySelector('#contact [role="tabpanel"] > div:first-child button');
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = template?.className ?? 'wechat-copy-button';
    const icon = template?.querySelector('svg');
    if (icon) copy.append(icon.cloneNode(true));
    copy.append('复制微信号');
    const status = document.createElement('span');
    status.className = 'text-xs';
    status.setAttribute('role', 'status');
    let feedbackTimer;
    copy.addEventListener('click', async event => {
      event.stopPropagation();
      let copied = false;
      try {
        await navigator.clipboard.writeText(contactWechat);
        copied = true;
      } catch {
        const field = document.createElement('textarea');
        field.value = contactWechat;
        field.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.append(field);
        field.select();
        try { copied = document.execCommand('copy'); } catch {}
        field.remove();
        copy.focus({ preventScroll: true });
      }
      status.textContent = copied ? '已复制' : '请长按或选中微信号复制';
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => { status.textContent = ''; }, 2500);
    });
    actions.append(copy, status);
    details.append(label, account, actions);
    const qr = document.createElement('img');
    qr.src = '/__zh/contacts/wechat-qr.png';
    qr.width = 160;
    qr.height = 160;
    qr.className = 'wechat-contact-qr';
    qr.alt = '微信 G024ovo 的个人二维码，使用微信扫一扫添加';
    card.append(details, qr);
    panel.append(card);
  }

  scan(document.body);
  if (document.querySelector('title')) scan(document.querySelector('title'));
  syncGameGuide();
  syncBlogLink();
  syncPhotographyGallery();
  syncPhotographyFloppy();
  syncAudioCase();
  syncLiveCasePanel();
  syncWechatPlaceholder();
  openWechatContact();

  // Batch only added/text nodes, and synchronize features for their own regions.
  const pending = new Set();
  const dirty = new Set();
  let scheduled = false;
  let lastPath = location.pathname;
  const featureRegions = {
    entries: 'header, section[aria-labelledby="hero-name"]',
    photography: '[data-photography-case], [data-local-zh="photography-gallery"]',
    audio: '[data-audio-case]',
    live: '[data-debug-case-one], [data-obs-case]',
    contact: '#contact',
    floppy: 'div.mx-auto.flex'
  };
  function markFeatures(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return;
    for (const [feature, selector] of Object.entries(featureRegions)) {
      if (feature === 'floppy' && location.pathname !== '/explore') continue;
      if (element.closest(selector) || element.querySelector(selector)) dirty.add(feature);
    }
  }
  function flushChanges() {
    scheduled = false;
    if (lastPath !== location.pathname) {
      lastPath = location.pathname;
      for (const feature of Object.keys(featureRegions)) dirty.add(feature);
      dirty.add('route');
    }
    // Drop descendants when their ancestor is already queued for translation.
    const nodes = [...pending].filter(node => node.isConnected);
    pending.clear();
    for (const node of nodes) {
      if (!nodes.some(parent => parent !== node && parent.contains(node))) scan(node);
    }
    const features = new Set(dirty);
    dirty.clear();
    if (features.has('route')) syncGameGuide();
    if (features.has('entries')) syncBlogLink();
    if (features.has('photography')) syncPhotographyGallery();
    if (features.has('floppy')) {
      syncPhotographyFloppy();
      syncAudioCase();
    } else if (features.has('audio')) syncAudioCase();
    if (features.has('live')) syncLiveCasePanel();
    if (features.has('contact')) {
      syncWechatPlaceholder();
      openWechatContact();
    }
  }
  function scheduleChanges() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flushChanges);
  }
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      markFeatures(record.target);
      if (record.type === 'attributes') translateElement(record.target);
      else if (record.type === 'characterData') pending.add(record.target);
      else {
        // Removing/replacing a child does not require rescanning all its siblings.
        for (const node of record.addedNodes) {
          pending.add(node);
          markFeatures(node);
        }
      }
    }
    if (pending.size || dirty.size || lastPath !== location.pathname) scheduleChanges();
  });
  window.addEventListener('popstate', () => { dirty.add('route'); scheduleChanges(); });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  const title = document.querySelector('title');
  if (title) observer.observe(title, { childList: true, characterData: true, subtree: true });
})().catch((error) => console.error('[简体中文本地化]', error));
