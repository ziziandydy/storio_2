#!/usr/bin/env python3
"""測試 scripts/supabase-keepalive.sh。用法：python3 scripts/tests/test_supabase_keepalive.py
在同一個程序內起假 Supabase REST 伺服器（執行緒），再以子程序呼叫 script。"""
import json
import os
import subprocess
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "supabase-keepalive.sh"


class MockSupabase:
    """mode: ok | get401 | get_html。requests 記錄收到的 '<METHOD> <path>'。"""

    def __init__(self, mode):
        self.requests = []
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                outer.requests.append(f"GET {self.path}")
                if mode == "get401":
                    status, ctype, body = 401, "application/json", json.dumps({"message": "Invalid API key"})
                elif mode == "get_html":
                    status, ctype, body = 200, "text/html", "<html>gateway ok</html>"
                else:
                    status, ctype, body = 200, "application/json", "[]"
                data = body.encode()
                self.send_response(status)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args):
                pass

        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


def run_script(env_extra, drop=()):
    env = {k: v for k, v in os.environ.items() if k not in drop}
    env.update(env_extra)
    return subprocess.run(["bash", str(SCRIPT)], env=env, capture_output=True, text=True, timeout=60)


class KeepaliveTest(unittest.TestCase):
    def with_mock(self, mode):
        mock = MockSupabase(mode)
        self.addCleanup(mock.close)
        return mock, run_script({"SUPABASE_URL": mock.url, "SUPABASE_ANON_KEY": "test-key"})

    def test_success_reads_collections_and_exits_zero(self):
        mock, r = self.with_mock("ok")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue(any(q.startswith("GET /rest/v1/collections") for q in mock.requests))

    def test_get_401_fails(self):
        _, r = self.with_mock("get401")
        self.assertNotEqual(r.returncode, 0)

    def test_non_array_200_fails_with_clear_message(self):
        _, r = self.with_mock("get_html")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("不是 JSON 陣列", r.stderr)

    def test_missing_env_fails(self):
        r = run_script({}, drop=("SUPABASE_URL", "SUPABASE_ANON_KEY"))
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("SUPABASE_URL", r.stderr)

    def test_unreachable_server_fails(self):
        r = run_script({"SUPABASE_URL": "http://127.0.0.1:1", "SUPABASE_ANON_KEY": "k"})
        self.assertNotEqual(r.returncode, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
