"""
心得建議（AI suggestion）的 prompt 組裝與輸出過濾。

建議會被使用者「直接點選當成自己的心得」，所以要的是使用者自己會說的口語短句，
而不是丟給使用者的反思問題。三個重點：
1. 每次從角度池隨機抽 3 個不同角度，避免三句長得一樣；角度池不含「推薦給誰／適合什麼時候看」，
   那是 AI 最愛套的公式。
2. prompt 明確禁止問句、說教大詞與推薦句型。
3. 模型仍可能違規，所以輸出再用規則過濾一次當安全網。
"""
import random
import re
from typing import Dict, List, Optional

MAX_SYNOPSIS_CHARS = 500
MAX_SUGGESTIONS = 3

# media_type -> (英文名, 中文名, 中文動詞)
_MEDIA = {
    "movie": ("movie", "電影", "看完"),
    "tv": ("series", "影集", "追完"),
    "book": ("book", "書", "讀完"),
}

# 角度池：只放「使用者自己的感受／印象」，不放需要編造個人經歷或推薦他人的角度
ANGLES: Dict[str, List[Dict[str, str]]] = {
    "zh-TW": [
        {"id": "feeling", "desc": "整體心情或餘韻（看完之後留下什麼感覺）"},
        {"id": "moment", "desc": "一個很籠統的瞬間、畫面或段落（只能寫簡介能支持的，不要編造具體劇情）"},
        {"id": "character", "desc": "對某個角色或人物關係的感覺"},
        {"id": "pace", "desc": "觀看（閱讀）過程的節奏感，例如前段、後段、中間的感受變化"},
        {"id": "expectation", "desc": "跟原本預期比起來有什麼不一樣"},
        {"id": "verdict", "desc": "用一句很個人的話下評語，可以帶一點幽默或比喻"},
        {"id": "aftertaste", "desc": "看完之後腦中還留著的一個東西（一段配樂、一句台詞、一個表情、一種氛圍）"},
    ],
    "en-US": [
        {"id": "feeling", "desc": "the overall mood or aftertaste it left"},
        {"id": "moment", "desc": "one broad moment, scene or passage (only what the synopsis supports; never invent plot details)"},
        {"id": "character", "desc": "how you felt about a character or a relationship"},
        {"id": "pace", "desc": "how the pacing felt while going through it (early, middle or late)"},
        {"id": "expectation", "desc": "how it differed from what you expected going in"},
        {"id": "verdict", "desc": "a personal one-line verdict, with a touch of humor or a comparison"},
        {"id": "aftertaste", "desc": "one thing still in your head afterwards (a piece of music, a line, a face, an atmosphere)"},
    ],
}


def pick_angles(language: str, rng: Optional[random.Random] = None, k: int = MAX_SUGGESTIONS) -> List[Dict[str, str]]:
    pool = ANGLES["zh-TW" if language == "zh-TW" else "en-US"]
    return (rng or random).sample(pool, k)


def _mood(rating: Optional[float], zh: bool) -> Optional[str]:
    if not rating or rating <= 0:
        return None
    if rating >= 8:
        return "很喜歡" if zh else "loved it"
    if rating <= 5:
        return "普通、有保留" if zh else "lukewarm, has reservations"
    return "還不錯" if zh else "liked it"


def build_suggestion_prompt(
    title: str,
    synopsis: Optional[str],
    language: str,
    media_type: Optional[str],
    rating: Optional[float],
    angles: List[Dict[str, str]],
) -> str:
    zh = language == "zh-TW"
    kind_en, kind_zh, verb = _MEDIA.get(media_type or "", ("work", "作品", "看完"))
    syn = (synopsis or "")[:MAX_SYNOPSIS_CHARS] or ("無" if zh else "N/A")
    mood = _mood(rating, zh)
    angle_lines = "\n".join(f"{i}. {a['desc']}" for i, a in enumerate(angles, 1))

    if zh:
        rating_block = f"\n使用者的評價：{rating:g}/10（{mood}）" if mood else ""
        tone_rule = f"\n- 語氣要符合使用者的評價（{rating:g}/10）：{mood}的話，不要寫成狂熱或刻薄。" if mood else ""
        return f"""你在幫使用者寫下「{verb}{kind_zh}後隨手記的短心得」。使用者會直接點選其中一句當成自己的心得（之後還能修改）。

作品：{title}（{kind_zh}）
簡介：{syn}{rating_block}

請寫 3 句「使用者自己會說的話」，每句各用下面一個不同角度，依序對應：
{angle_lines}

規則：
- 第一人稱、口語，像傳訊息給朋友，15 到 40 個字，一句話。
- 不要問句，不要對使用者提問。
- 不要說教，不要使用「人生、本質、探討、反思、省思、意義、人性、啟發」這類大詞。
- 不要推薦句：不要「適合…的時候」「適合…的人」「推薦給…」「值得一看」。
- 少用「真的、超、非常、極其」這類強調詞。
- 三句的開頭和句型要明顯不同，不要都用同一種結構。
- 不要劇透，不要複述簡介，不要編造簡介裡沒有的具體劇情。{tone_rule}

範例（僅示範語氣，別照抄內容）：
- 「後勁很強，走出戲院還在回味那段配樂。」
- 「前半有點悶，但最後半小時整個被拉回來。」
- 「那個結尾我看完又倒回去看了一次。」

只輸出 JSON 陣列：["…","…","…"]"""

    rating_block = f"\nUser's rating: {rating:g}/10 ({mood})" if mood else ""
    tone_rule = f"\n- Match the rating ({rating:g}/10): if {mood}, don't gush or trash it." if mood else ""
    return f"""You are helping a user jot down a quick, casual note after finishing a {kind_en}. They will tap one line and use it as their own note (editable afterwards).

Work: {title} ({kind_en})
Synopsis: {syn}{rating_block}

Write 3 lines the user might actually say, one per angle below, in order:
{angle_lines}

Rules:
- First person, conversational, like texting a friend. One sentence, 8 to 20 words.
- No questions. Never address the user.
- No preaching, and none of these words: meaningful, profound, explores, reflects, humanity, journey, themes, insight.
- No recommendations: never "Best watched when…", "Perfect for…", "Great for…", "If you like…", "I'd recommend…".
- Avoid intensifiers such as "incredibly", "really", "truly", "absolutely".
- Give the three lines clearly different openings and sentence shapes.
- No spoilers, don't restate the synopsis, don't invent plot details the synopsis doesn't support.{tone_rule}

Tone examples (don't copy): "Still thinking about that ending on the train home." / "Slow start, but the last act totally won me over." / "I rewatched the final scene right after it ended."

Output ONLY a JSON array: ["...","...","..."]"""


# ---- 輸出過濾（模型違規時的安全網）----

_QUESTION = re.compile(r"[?？]")
_BANNED = {
    "zh-TW": re.compile(
        r"適合|推薦|值得一(?:看|讀|追)|必看|必讀|"
        r"人生|本質|探討|反思|省思|人性|啟發|意義|思考"
    ),
    "en-US": re.compile(
        r"\b(?:best|perfect|great|ideal)\s+(?:watched|read|for|when|if)\b|"
        r"\brecommend|\bworth (?:watching|reading)\b|\bmust[- ](?:watch|read)\b|"
        r"\bif you (?:like|love|enjoy)\b|\bfor anyone who\b|"
        r"\bmeaningful\b|\bprofound\b|\bexplor(?:es|ation)\b|\bhumanity\b|\bjourney\b|\binsight",
        re.IGNORECASE,
    ),
}


def filter_suggestions(items: List[object], language: str) -> List[str]:
    banned = _BANNED["zh-TW" if language == "zh-TW" else "en-US"]
    out: List[str] = []
    for raw in items:
        if not isinstance(raw, str):
            continue
        s = raw.strip()
        if not s or s in out:
            continue
        if _QUESTION.search(s) or banned.search(s):
            continue
        out.append(s)
        if len(out) == MAX_SUGGESTIONS:
            break
    return out
