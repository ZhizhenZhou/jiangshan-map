#!/usr/bin/env python3
"""开发用静态服务器：对 index.html 禁缓存，其余资源走内容哈希查询串。

python3 -m http.server 不发 Cache-Control，浏览器会启发式缓存 index.html，
导致刷新后仍加载旧页面（脚本哈希标签是旧的）。用法：

    python3 scripts/dev_server.py [port]   # 默认 8792
"""
import http.server
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8792


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # index.html 无内容哈希可依赖，必须每次校验；
        # 其余带 ?v= 内容哈希的资源本就可安全长缓存，这里统一 no-cache 保守处理。
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    os.chdir(ROOT)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler)
    print(f"Serving {ROOT} at http://127.0.0.1:{PORT}/ (no-cache headers on)")
    sys.stderr.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
