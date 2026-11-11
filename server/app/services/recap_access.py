"""年度 Recap 往年回看權限：整個後端唯一的判斷點。

目前所有年份一律開放；日後要改成「往年只開給訂閱者」只需改這個函式，呼叫端不必動。
"""


def can_view_recap_year(user_id: str, year: int) -> bool:
    return True
