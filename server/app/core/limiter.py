from slowapi import Limiter
from slowapi.util import get_remote_address

# 共享 Limiter 實例：main.py 掛載至 app.state，各 endpoint 從此 import
# 必須是同一個物件，slowapi 才能正確計數
limiter = Limiter(key_func=get_remote_address)
