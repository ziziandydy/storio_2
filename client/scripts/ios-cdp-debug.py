"""iOS WKWebView CDP legacy multi-target protocol 小工具。

背景：ios_webkit_debug_proxy 暴露的是 WebKit 的 legacy multi-target CDP，
不是 Chrome 的 flat CDP——指令要包在 Target.sendMessageToTarget 裡送出，
且 awaitPromise 不可靠，非同步結果要靠輪詢拿。詳見 docs/DEV_SETUP.md Q8/Q9。

前置：
  0. pip install websocket-client（或用 server/requirements.txt 裡現成的那份）
  1. brew install ios-webkit-debug-proxy
  2. 手機/模擬器打開 Web Inspector（設定 → Safari → 進階）
  3. ios_webkit_debug_proxy -c <UDID>:9222   (實體裝置)
     或 ios_webkit_debug_proxy -s "unix:<socket>" -c null:9221,:9222-9230  (模擬器)
  4. curl http://localhost:9222/json 確認能看到目標頁面

用法：
  python3 ios-cdp-debug.py eval "location.href"
  python3 ios-cdp-debug.py eval "document.body.innerText.slice(0,300)"
  python3 ios-cdp-debug.py watch 10          # 監看 10 秒內的 console 輸出
  python3 ios-cdp-debug.py logs 5            # 收集 5 秒 log 後印出

可用 --ws ws://localhost:9222/devtools/page/N 指定非預設的 WebSocket URL
（同時多個分頁時，用 curl http://localhost:9222/json 找正確的 page 編號）。
"""
import websocket
import json
import sys
import time
import threading

DEFAULT_WS_URL = "ws://localhost:9222/devtools/page/1"


class CDP:
    def __init__(self, url):
        self.ws = websocket.create_connection(url)
        self.target_id = None
        self.msg_id = 1000
        self.pending = {}
        self.console_logs = []
        self.lock = threading.Lock()
        self.running = True
        self.thread = threading.Thread(target=self._listen, daemon=True)
        self.thread.start()

    def _listen(self):
        while self.running:
            try:
                raw = self.ws.recv()
            except Exception:
                break
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            method = msg.get("method")
            if method == "Target.targetCreated":
                info = msg["params"]["targetInfo"]
                if info.get("type") == "page":
                    self.target_id = info["targetId"]
                    print(f"[target found] {self.target_id}", file=sys.stderr)
            elif method == "Target.dispatchMessageFromTarget":
                inner = json.loads(msg["params"]["message"])
                if "id" in inner:
                    with self.lock:
                        self.pending[inner["id"]] = inner
                elif inner.get("method") == "Console.messageAdded":
                    self.console_logs.append(inner["params"]["message"])
                elif inner.get("method") == "Runtime.consoleAPICalled":
                    self.console_logs.append(inner["params"])

    def send_to_target(self, method, params=None, wait=3.0):
        if not self.target_id:
            for _ in range(20):
                if self.target_id:
                    break
                time.sleep(0.2)
        self.msg_id += 1
        mid = self.msg_id
        inner_msg = {"id": mid, "method": method, "params": params or {}}
        outer = {
            "id": self.msg_id + 100000,
            "method": "Target.sendMessageToTarget",
            "params": {"targetId": self.target_id, "message": json.dumps(inner_msg)},
        }
        self.ws.send(json.dumps(outer))
        deadline = time.time() + wait
        while time.time() < deadline:
            with self.lock:
                if mid in self.pending:
                    return self.pending.pop(mid)
            time.sleep(0.05)
        return None

    def enable_console(self):
        self.send_to_target("Console.enable")
        self.send_to_target("Runtime.enable")

    def evaluate(self, expr, wait=3.0):
        return self.send_to_target(
            "Runtime.evaluate", {"expression": expr, "returnByValue": True}, wait=wait
        )


if __name__ == "__main__":
    args = sys.argv[1:]
    ws_url = DEFAULT_WS_URL
    if "--ws" in args:
        idx = args.index("--ws")
        ws_url = args[idx + 1]
        del args[idx : idx + 2]

    action = args[0] if args else "status"
    cdp = CDP(ws_url)
    time.sleep(1.5)
    cdp.enable_console()

    if action == "eval":
        print(json.dumps(cdp.evaluate(args[1]), ensure_ascii=False, indent=2))
    elif action == "logs":
        time.sleep(float(args[1]) if len(args) > 1 else 5.0)
        for entry in cdp.console_logs:
            print(json.dumps(entry, ensure_ascii=False))
    elif action == "watch":
        duration = float(args[1]) if len(args) > 1 else 15.0
        start, seen = time.time(), 0
        while time.time() - start < duration:
            with cdp.lock:
                new, seen = cdp.console_logs[seen:], len(cdp.console_logs)
            for entry in new:
                print(json.dumps(entry, ensure_ascii=False), flush=True)
            time.sleep(0.3)
    else:
        print(f"target_id={cdp.target_id}")
