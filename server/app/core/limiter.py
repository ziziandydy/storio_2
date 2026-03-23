from fastapi import Request
from slowapi import Limiter


def get_client_ip(request: Request) -> str:
    """
    讀取真實 client IP，優先使用 X-Forwarded-For。
    Railway / 反向代理環境下 request.client.host 是 proxy 內部 IP（100.64.x.x），
    必須讀 X-Forwarded-For 才能得到真實 IP 並正確計數。
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


# 共享 Limiter 實例：main.py 掛載至 app.state，各 endpoint 從此 import
# 必須是同一個物件，slowapi 才能正確計數
limiter = Limiter(key_func=get_client_ip)
