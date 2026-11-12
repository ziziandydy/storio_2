from typing import List, Optional

from pydantic import BaseModel


class RecapResponse(BaseModel):
    """年度 Recap 回應：每個場景要嘛是資料物件、要嘛是 None（條件不足，前端跳過該場景）。"""
    year: int
    is_partial: bool  # 當年（尚未結束）→ 「今年到目前為止」
    total_count: int
    metadata_pending: int  # 超過補抓時間預算而尚未補完的收藏數；> 0 時前端可再取一次

    opening: dict  # 永遠有：{"year"}
    total: dict  # 永遠有：time_summary
    movies: Optional[dict] = None
    series: Optional[dict] = None
    books: Optional[dict] = None
    genres: Optional[dict] = None  # {"top": [{"name", "count"}]}
    eras: Optional[dict] = None
    title: Optional[dict] = None  # {"id", "zh", "en"}
    monthly: Optional[dict] = None  # {"counts": [12 個整數]}
    peak_month: Optional[dict] = None
    months_active: Optional[dict] = None
    top_rated: Optional[dict] = None
    first_last: Optional[dict] = None
    reflection: Optional[dict] = None
    closing: dict  # 永遠有：{}


class RecapYear(BaseModel):
    year: int
    count: int


class RecapCurrent(BaseModel):
    """伺服器今天所在年份與該年目前部數（不受門檻限制）。"""
    year: int
    count: int


class RecapYearsResponse(BaseModel):
    threshold: int
    years: List[RecapYear]
    current: RecapCurrent
