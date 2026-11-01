from fastapi import Request
from slowapi import Limiter


def get_client_ip(request: Request) -> str:
    """
    讀取真實 client IP。
    Railway / 反向代理環境下 request.client.host 是 proxy 內部 IP（100.64.x.x），
    必須讀 X-Forwarded-For。代理會把連線來源 IP 附加在最右邊，最左邊的值由 client 自己帶，
    可任意偽造，所以取最右邊一段，偽造前段無法繞過限流。
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "127.0.0.1"


# 共享 Limiter 實例：main.py 掛載至 app.state，各 endpoint 從此 import
# 必須是同一個物件，slowapi 才能正確計數
limiter = Limiter(key_func=get_client_ip)
