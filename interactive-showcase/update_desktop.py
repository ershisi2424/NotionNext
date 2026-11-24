"""汉化电脑内置文档的初始内容及终端帮助，保留文件 ID、命令和用户输入。"""
import json
import re
import subprocess
from pathlib import Path

from mirror import CACHE, atomic_write

ROOT = Path(__file__).resolve().parent


def main():
    messages = {}
    for line in (ROOT / 'zh-CN.tsv').read_text(encoding='utf-8-sig').splitlines():
        if line and not line.startswith('#') and '\t' in line:
            key, value = line.split('\t', 1)
            messages[key.replace('\\n', '\n')] = value.replace('\\n', '\n')
    changed = 0
    for metadata in CACHE.glob('*/*/response.json'):
        record = json.loads(metadata.read_text(encoding='utf-8'))
        if not record['url'].split('?', 1)[0].endswith('.js'):
            continue
        path = metadata.with_name(record.get('body', 'body'))
        source = path.read_text(encoding='utf-8')
        if not any(marker in source for marker in ('documents-readme', 'getTerminalWindows', 'ABOUT ME')):
            continue
        updated = source
        # 只替换完整的长文本字符串；短名称仍由 DOM 词典翻译，避免改变文件路径和命令。
        for key, value in messages.items():
            if len(key) > 60:
                updated = updated.replace(json.dumps(key, ensure_ascii=False), json.dumps(value, ensure_ascii=False))
        help_match = re.search(r'`Built-in commands:\n[^`]+`', updated)
        if help_match:
            help_text = '''内置命令：
  help                 显示帮助
  clear                清空屏幕
  pwd                  显示当前目录
  ls [path]            列出文件夹内容
  cd [path]            切换目录（..  ~  /）
  cat <file>           查看文件内容
  open <name>          打开文件夹或文档
  mkdir <name>         新建文件夹
  touch <name>         新建空文件
  rm <name>            移到废纸篓
  echo <text>          显示文字
  whoami               显示当前用户
  hostname             显示电脑名称
  date                 显示当前日期
  uname                显示系统信息
  history              查看命令历史
  neofetch             显示系统概览
  fortune              随机小语'''
            updated = updated[:help_match.start()] + json.dumps(help_text, ensure_ascii=False) + updated[help_match.end():]
        if updated == source:
            continue
        subprocess.run(['node', '--check', '-'], input=updated, encoding='utf-8', check=True, capture_output=True)
        atomic_write(path, updated.encode('utf-8'))
        changed += 1
    print(f'已更新 {changed} 个电脑内容模块；JavaScript 语法检查通过。')


if __name__ == '__main__':
    main()
