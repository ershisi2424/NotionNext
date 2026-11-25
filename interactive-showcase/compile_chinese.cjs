/* Compile UI text into captured HTML, Flight data and client modules.
 * Use syntax nodes, never raw replacements of executable identifiers/keys.
 * Run after editing the dictionary or snapshots, before asset_pipeline.py.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = __dirname;
const dictionary = new Map();
for (const line of fs.readFileSync(path.join(root, 'zh-CN.tsv'), 'utf8').split(/\r?\n/)) {
  if (line.startsWith('#') || !line.includes('\t')) continue;
  const split = line.indexOf('\t');
  dictionary.set(line.slice(0, split).replace(/\\n/g, '\n').trim().replace(/\s+/g, ' '), line.slice(split + 1).replace(/\\n/g, '\n'));
}
dictionary.delete('users'); // Filesystem/terminal identifiers remain unchanged.
const overrides = {
  'Sina Gholizadeh': '二十四调试',
  'LinkedIn': '微信',
  '[email protected]': 'ershisigu@qq.com',
  'Giftbede': '摄影作品集',
  'Iconly Pro': 'Douyin Live',
  'Campaign Lark': 'OBS Studio',
  'Solsta': 'Kuaishou live',
  'Maileroo': '声卡调试与音色优化',
  'Wassieverse Canvas': '室内 · 演播厅搭建',
  'Laelaps': '室外 · 大舞台搭建',
  'Switching on the lamp.': '正在点亮台灯。',
  'Plugging in the Nintendo.': '正在连接游戏机。',
  'Warming up the CRT.': '正在预热显示器。',
  'Stacking the floppies.': '正在整理软盘。',
  'Opening the Rolodex.': '正在打开名片夹。',
  'Booting the Mac.': '正在启动电脑。',
  'The desk is ready.': '桌面已准备就绪。',
  'Loading the desk': '正在加载桌面',
  'Mac · Keyboard · Lamp': '电脑 · 键盘 · 台灯',
  'Floppies · Notebook': '软盘 · 笔记本',
  'Floppies · Cartridges': '软盘 · 游戏卡带',
  'CRT · Nintendo': '显示器 · 游戏机',
  'Rolodex · Shelf': '名片夹 · 书架',
  'My Macintosh': '我的Hua Wei',
  'Books (CRT shelf)': '显示器旁的书籍',
  'Books (right shelf)': '右侧书架',
  'Lava lamp': '熔岩灯',
  'Ghost lamp': '幽灵灯',
  'Cassette': '磁带',
  'Handheld': '掌机',
  'Magazines': '杂志',
  'Arrows or WASD · Space to start · Esc pauses, Esc again leaves': '方向键或 WASD 移动 · 空格开始 · Esc 暂停，再按一次退出',
  'Understand': '理解需求',
  'Prototype': '制作原型',
  'Ship and learn': '交付与复盘',
  '04 / Process': '04 / 流程',
  'How I work': '调试流程',
  'Four steps, one spread each. The pages are from the notebook on my desk.': '把调试过程拆成四步，记录在桌上的笔记本中。',
  'Location:': '所在地：',
  'Repository': '代码仓库',
  '← Previous': '← 上一篇',
  'Collapse': '收起',
  'Expand': '展开',
  'Technologies': '常用技术',
  'Project details coming soon.': '项目详情即将补充。',
  'Fork bomb defused. This Mac has 4 MB of RAM and needs every byte.': '已拦截无限创建进程的命令。这台电脑只有 4 MB 内存，需要省着用。',
  'sina is not in the sudoers file. This incident will be reported.\n(To the portfolio owner, who says hi.)': '当前用户没有管理员权限。操作已记录，站长向你问好。',
  'usage: sudo <command>': '用法：sudo <命令>',
  'rm: refusing to delete the whole portfolio. Nice try.\n(You would need sudo for that. Go on.)': 'rm：不能删除整个展示区。当前用户没有执行此操作的权限。',
  'chmod: permissions are fine the way they are.': 'chmod：当前权限无需修改。',
  'Formatting is disabled: this disk holds the only copy of my portfolio.': '此磁盘保存着展示区内容，不能格式化。',
  'It is safe to turn off your Macintosh. (It is not. Please stay.)': '电脑还在运行，欢迎继续探索。',
  'There is no exit. Close this window, or press Esc to step back from the Mac.': '请关闭此窗口，或按 Esc 返回桌面场景。',
  'Back to': '返回：',
  'Go to': '切换到：',
  'command not found:': '找不到命令：',
  'no such file or directory:': '文件或目录不存在：',
  'no such file:': '文件不存在：',
  'not a directory:': '这不是目录：',
  'cannot remove system item:': '不能删除系统项目：',
  'cannot download:': '无法下载：',
  'cannot create:': '无法创建：',
  'downloading:': '正在下载：',
  'opened:': '已打开：',
  'created:': '已创建：',
  'usage:': '用法：',
};
for (const [key, value] of Object.entries(overrides)) dictionary.set(key, value);
function text(value) {
  if (value.startsWith('/cdn-cgi/l/email-protection')) return 'mailto:ershisigu@qq.com';
  const clock = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value);
  if (clock) return (clock[3].toUpperCase() === 'AM' ? '上午 ' : '下午 ') + clock[1] + ':' + clock[2];
  value = value.replaceAll('hi@c-na.dev', 'ershisigu@qq.com');
  const key = value.trim().replace(/\s+/g, ' ');
  let result = dictionary.get(key);
  if (result === undefined && value.includes(' · Case study')) result = value.replace(' · Case study', ' · 案例详情').replaceAll('Sina Gholizadeh', '二十四调试');
  if (result === undefined) return value;
  return value.match(/^\s*/)[0] + result + value.match(/\s*$/)[0];
}
function data(value) {
  if (typeof value === 'string') return text(value);
  if (Array.isArray(value)) return value.map(data);
  if (value && typeof value === 'object') {
    const result = Object.fromEntries(Object.entries(value).map(([key, val]) => [key, data(val)]));
    if (value.id === 'hero-name') result.children = '二十四直播调试';
    if (value.lang === 'en') result.lang = 'zh-CN';
    return result;
  }
  return value;
}
function flight(value) {
  const input = Buffer.from(value);
  let offset = 0, result = '';
  while (offset < input.length) {
    const rest = input.subarray(offset).toString();
    const rawText = /^([a-f0-9]+):T([a-f0-9]+),/.exec(rest);
    if (rawText) {
      const start = offset + Buffer.byteLength(rawText[0]);
      const length = parseInt(rawText[2], 16);
      const translated = text(input.subarray(start, start + length).toString());
      result += `${rawText[1]}:T${Buffer.byteLength(translated).toString(16)},${translated}`;
      offset = start + length;
      continue;
    }
    const newline = input.indexOf(10, offset);
    const end = newline < 0 ? input.length : newline;
    let line = input.subarray(offset, end).toString();
    const record = /^([a-f0-9]+:)([A-Z]*)([\s\S]*)$/.exec(line);
    if (record && !record[2].includes('I')) {
      try { line = record[1] + record[2] + JSON.stringify(data(JSON.parse(record[3]))); } catch {}
    }
    result += line + (newline < 0 ? '' : '\n');
    offset = end + 1;
  }
  return result;
}
function javascript(source) {
  try { return JSON.stringify(data(JSON.parse(source))); } catch {}
  const tree = parser.parse(source, { sourceType: 'unambiguous' });
  const edits = [];
  traverse(tree, {
    FunctionDeclaration(p) {
      const body = source.slice(p.node.start, p.node.end);
      if (!body.includes('.getHours()') || !body.includes('.getMinutes()') || !body.includes('"AM"') || !body.includes('"PM"')) return;
      p.traverse({
        StringLiteral(q) {
          if (q.node.value === 'AM' || q.node.value === 'PM') edits.push([q.node.start, q.node.end, JSON.stringify(q.node.value === 'AM' ? '上午' : '下午')]);
        },
        TemplateLiteral(q) {
          const n = q.node;
          if (n.expressions.length !== 3 || n.quasis.map(x => x.value.raw).join('|') !== '|:| |') return;
          const values = n.expressions.map(x => source.slice(x.start, x.end));
          edits.push([n.start, n.end, '`' + '${' + values[2] + '} ${' + values[0] + '}:${' + values[1] + '}' + '`']);
        }
      });
    },
    StringLiteral(p) {
      const n = p.node, parent = p.parent;
      if ((parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod') && parent.key === n && !parent.computed) return;
      if (parent.type === 'MemberExpression' && parent.property === n) return;
      // Turbopack export names are executable bindings, even if they look like UI words.
      if (parent.type === 'ArrayExpression' && p.parentPath.parent.type === 'CallExpression') {
        const call = p.parentPath.parent;
        if (call.callee.type === 'MemberExpression' && call.callee.property.name === 's') {
          for (let i = 0; i < parent.elements.length;) {
            if (parent.elements[i] === n) return;
            i += parent.elements[i + 1]?.type === 'NumericLiteral' ? 3 : 2;
          }
        }
      }
      let next = /^[a-f0-9]+:(?:I|T|\[|\{)/m.test(n.value) ? flight(n.value) : text(n.value);
      if (next !== n.value) edits.push([n.start, n.end, JSON.stringify(next)]);
    },
    TemplateElement(p) {
      const n = p.node;
      if (n.value.cooked == null) return;
      const next = text(n.value.cooked);
      if (next !== n.value.cooked) edits.push([n.start, n.end, next.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')]);
    },
    ObjectExpression(p) {
      const properties = p.node.properties.filter(n => n.type === 'ObjectProperty');
      const key = n => n.key.name ?? n.key.value;
      if (!properties.some(n => key(n) === 'id' && n.value.value === 'hero-name')) return;
      const child = properties.find(n => key(n) === 'children');
      if (child && child.value.type !== 'StringLiteral') edits.push([child.value.start, child.value.end, JSON.stringify('二十四直播调试')]);
    }
  });
  edits.sort((a, b) => b[0] - a[0]);
  for (const [start, end, replacement] of edits) source = source.slice(0, start) + replacement + source.slice(end);
  // Parse the generated module too, so a bad template edit cannot be published.
  parser.parse(source, { sourceType: 'unambiguous' });
  return source;
}
function decode(value) {
  return value.replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : +code))
    .replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&nbsp;', '\u00a0').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
}
function escape(value) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function markup(source) {
  const scripts = [];
  source = source.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, body, close) => {
    const index = scripts.length;
    scripts.push(open + (body.trim() ? javascript(body) : body) + close);
    return `<!--native-script-${index}-->`;
  });
  source = source.replace(/>([^<>]+)</g, (all, value) => {
    const decoded = decode(value), translated = text(decoded);
    return translated === decoded ? all : '>' + escape(translated) + '<';
  }).replace(/\b(alt|title|aria-label|placeholder)="([^"]*)"/g, (all, key, value) => {
    const decoded = decode(value), translated = text(decoded);
    return translated === decoded ? all : `${key}="${escape(translated)}"`;
  }).replace(/(<h1\b[^>]*\bid="hero-name"[^>]*>)[\s\S]*?(<\/h1>)/, '$1二十四直播调试$2');
  return source.replace(/<!--native-script-(\d+)-->/g, (_, index) => scripts[+index])
    .replace(/(<html\b[^>]*\blang=")[^"]*(")/, '$1zh-CN$2')
    .replace(/(<span\b[^>]*class="__cf_email__"[^>]*>)[\s\S]*?(<\/span>)/g, '$1ershisigu@qq.com$2')
    .replace(/href="\/cdn-cgi\/l\/email-protection[^"]*"/g, 'href="mailto:ershisigu@qq.com"');
}
const payloads = {}, report = [], sources = new Set();
for (const shard of fs.readdirSync(path.join(root, 'snapshot')).sort()) {
  for (const key of fs.readdirSync(path.join(root, 'snapshot', shard)).sort()) {
    const dir = path.join(root, 'snapshot', shard, key), meta = path.join(dir, 'response.json');
    if (!fs.existsSync(meta)) continue;
    const record = JSON.parse(fs.readFileSync(meta));
    if (record.status !== 200 || !/(javascript|text\/html|text\/x-component)/.test(record.content_type)) continue;
    const source = fs.readFileSync(path.join(dir, record.body || 'body'), 'utf8').replaceAll('\r\n', '\n');
    const hash = crypto.createHash('sha256').update(source).digest('hex');
    sources.add(hash);
    if (payloads[hash]) continue;
    const output = record.content_type.includes('javascript') ? javascript(source) : record.content_type.includes('text/html') ? markup(source) : flight(source);
    if (source !== output) {
      payloads[hash] = zlib.deflateSync(Buffer.from(output)).toString('base64');
      report.push({ url: record.url, variant: record.variant || {}, bytes: Buffer.byteLength(output) });
    }
  }
}
const fileHash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name), 'utf8').replaceAll('\r\n', '\n')).digest('hex');
fs.writeFileSync(path.join(root, 'native-zh.json'), JSON.stringify({ dictionary_sha: fileHash('zh-CN.tsv'), compiler_sha: fileHash('compile_chinese.cjs'), sources: [...sources].sort(), overrides, payloads }) + '\n');
console.log(`Compiled ${report.length} Chinese payloads; ${Object.keys(payloads).length} unique source hashes`);
