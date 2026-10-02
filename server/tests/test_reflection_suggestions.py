"""
心得建議（AI suggestion）：口語短句、不出問句、三句角度各異、不得套公式「適合…／Best watched when…」。

全程 mock Gemini，不打真實 API。
"""
import json
import random
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import gemini_service
from app.services.reflection_suggestion_prompt import (
    ANGLES,
    build_suggestion_prompt,
    filter_suggestions,
    pick_angles,
)


# ---------- pick_angles ----------

def test_pick_angles_returns_three_distinct_angles():
    angles = pick_angles("zh-TW", rng=random.Random(1))
    assert len(angles) == 3
    assert len({a["id"] for a in angles}) == 3


def test_pick_angles_is_deterministic_for_a_seed():
    a = [x["id"] for x in pick_angles("en-US", rng=random.Random(7))]
    b = [x["id"] for x in pick_angles("en-US", rng=random.Random(7))]
    assert a == b


def test_pick_angles_varies_across_seeds():
    seen = {tuple(x["id"] for x in pick_angles("zh-TW", rng=random.Random(s))) for s in range(30)}
    assert len(seen) > 5, "角度組合應該有足夠變化，否則每次都長得一樣"


def test_no_angle_is_a_recommendation():
    """『推薦給誰／適合什麼時候看』是被抱怨的公式，不可作為角度。"""
    for lang in ("zh-TW", "en-US"):
        for a in ANGLES[lang]:
            assert "推薦" not in a["desc"] and "適合" not in a["desc"]
            assert "recommend" not in a["desc"].lower() and "best watched" not in a["desc"].lower()


# ---------- build_suggestion_prompt ----------

def test_prompt_includes_title_synopsis_and_media_kind_zh():
    angles = pick_angles("zh-TW", rng=random.Random(1))
    p = build_suggestion_prompt("沙丘", "一段簡介", "zh-TW", "movie", None, angles)
    assert "沙丘" in p and "一段簡介" in p and "電影" in p
    assert "看完" in p


def test_prompt_uses_kind_specific_verb():
    angles = pick_angles("zh-TW", rng=random.Random(1))
    assert "讀完" in build_suggestion_prompt("書", None, "zh-TW", "book", None, angles)
    assert "追完" in build_suggestion_prompt("劇", None, "zh-TW", "tv", None, angles)


def test_prompt_lists_each_chosen_angle():
    angles = pick_angles("en-US", rng=random.Random(3))
    p = build_suggestion_prompt("Dune", "synopsis", "en-US", "movie", None, angles)
    for a in angles:
        assert a["desc"] in p


def test_prompt_forbids_questions_and_recommendation_formula_zh():
    p = build_suggestion_prompt("t", None, "zh-TW", "movie", None, pick_angles("zh-TW", rng=random.Random(1)))
    assert "不要問句" in p
    assert "適合" in p          # 出現在「禁止」清單裡
    for banned in ("人生", "本質", "反思"):
        assert banned in p


def test_prompt_forbids_questions_and_recommendation_formula_en():
    p = build_suggestion_prompt("t", None, "en-US", "movie", None, pick_angles("en-US", rng=random.Random(1)))
    assert "No questions" in p
    assert "Best watched when" in p
    assert "incredibly" in p


def test_prompt_adapts_to_rating():
    angles = pick_angles("zh-TW", rng=random.Random(1))
    high = build_suggestion_prompt("t", None, "zh-TW", "movie", 9, angles)
    low = build_suggestion_prompt("t", None, "zh-TW", "movie", 4, angles)
    none = build_suggestion_prompt("t", None, "zh-TW", "movie", None, angles)
    assert "9/10" in high and "很喜歡" in high
    assert "4/10" in low and "保留" in low
    assert "/10" not in none


def test_prompt_ignores_zero_rating_and_unknown_media_type():
    angles = pick_angles("en-US", rng=random.Random(1))
    p = build_suggestion_prompt("t", None, "en-US", "podcast", 0, angles)
    assert "/10" not in p
    assert "podcast" not in p.lower().split("work:")[1].split("\n")[0]


def test_prompt_truncates_long_synopsis():
    angles = pick_angles("en-US", rng=random.Random(1))
    p = build_suggestion_prompt("t", "x" * 2000, "en-US", "movie", None, angles)
    assert "x" * 501 not in p


# ---------- filter_suggestions ----------

@pytest.mark.parametrize("bad", [
    "適合在下雨的週末晚上慢慢看。",
    "很適合跟朋友一起看。",
    "推薦給喜歡慢熱電影的人。",
    "值得一看的好片。",
    "這部片讓我思考，人生到底是什麼？",
    "你會怎麼選擇呢?",
    "看完後我是否也該反思自己的生活。",
    "讓我重新思考人性的本質。",
])
def test_filter_drops_formulaic_or_heavy_zh(bad):
    assert filter_suggestions([bad], "zh-TW") == []


@pytest.mark.parametrize("bad", [
    "Best watched when you're in the mood for something quiet.",
    "Perfect for a rainy Sunday.",
    "Great for anyone who loves slow burns.",
    "I'd recommend it to everyone.",
    "If you like quiet dramas, you'll love this.",
    "What does it mean to love someone?",
    "A profound exploration of humanity.",
])
def test_filter_drops_formulaic_or_heavy_en(bad):
    assert filter_suggestions([bad], "en-US") == []


def test_filter_keeps_good_lines_and_order():
    good = ["後勁很強，走出戲院還在回味那段配樂。", "前半有點悶，但最後半小時整個被拉回來。", "那個結尾我整晚都沒睡著。"]
    assert filter_suggestions(good, "zh-TW") == good


def test_filter_keeps_good_english_lines():
    good = ["Still thinking about that ending on the train home.", "Slow start, but the last act won me over."]
    assert filter_suggestions(good, "en-US") == good


def test_filter_removes_only_the_bad_ones():
    mixed = ["後勁很強，到現在還在想那個畫面。", "適合在週末夜晚慢慢看。", "結尾那一幕我看了兩次。"]
    assert filter_suggestions(mixed, "zh-TW") == [mixed[0], mixed[2]]


def test_filter_drops_empty_and_non_string_and_dedupes():
    assert filter_suggestions(["", "  ", None, 3, "好看。", "好看。"], "zh-TW") == ["好看。"]


def test_filter_caps_at_three():
    assert len(filter_suggestions([f"第{i}句很不錯。" for i in range(6)], "zh-TW")) == 3


# ---------- GeminiService.generate_reflection_suggestions ----------

def _gemini_patches(model):
    return (
        patch.object(settings, "GEMINI_API_KEY", "fake"),
        patch.object(settings, "OPENAI_API_KEY", ""),  # 不可因本機 .env 有 key 而真的打 OpenAI 備援
        patch.object(gemini_service.genai, "configure"),
        patch.object(gemini_service.genai, "GenerativeModel", return_value=model),
        patch.object(gemini_service, "log_ai_usage"),
    )


def _model(text):
    resp = MagicMock()
    resp.text = text
    resp.usage_metadata = None
    model = MagicMock()
    model.generate_content_async = AsyncMock(return_value=resp)
    return model


async def _run(model, **kw):
    p1, p2, p3, p4, p5 = _gemini_patches(model)
    with p1, p2, p3, p4 as gm, p5:
        out = await gemini_service.GeminiService.generate_reflection_suggestions("Dune", "syn", **kw)
    return out, gm


@pytest.mark.asyncio
async def test_service_prompt_carries_media_type_and_rating():
    model = _model(json.dumps(["看完還在回味。", "那段配樂太好聽。", "結尾讓我愣住。"]))
    out, _ = await _run(model, language="zh-TW", media_type="book", rating=9)
    prompt = model.generate_content_async.call_args.args[0]
    assert "讀完" in prompt and "9/10" in prompt
    assert out == ["看完還在回味。", "那段配樂太好聽。", "結尾讓我愣住。"]


@pytest.mark.asyncio
async def test_service_filters_formulaic_lines_from_model_output():
    model = _model(json.dumps(["看完還在回味。", "適合在週末夜晚慢慢看。", "你覺得人生的意義是什麼？"]))
    out, _ = await _run(model, language="zh-TW", media_type="movie")
    assert out == ["看完還在回味。"]


@pytest.mark.asyncio
async def test_service_returns_empty_when_everything_is_filtered():
    model = _model(json.dumps(["適合週末看。", "推薦給大家。", "值得一看。"]))
    out, _ = await _run(model, language="zh-TW")
    assert out == []


@pytest.mark.asyncio
async def test_service_uses_higher_temperature_for_variety():
    model = _model(json.dumps(["好看。"]))
    _, gm = await _run(model, language="zh-TW")
    cfg = gm.call_args.kwargs.get("generation_config", {})
    assert 0.7 <= cfg.get("temperature", 0) <= 1.0


@pytest.mark.asyncio
async def test_service_backwards_compatible_without_new_params():
    model = _model(json.dumps(["s1.", "s2.", "s3."]))
    p1, p2, p3, p4, p5 = _gemini_patches(model)
    with p1, p2, p3, p4, p5:
        out = await gemini_service.GeminiService.generate_reflection_suggestions("Some Title")
    assert out == ["s1.", "s2.", "s3."]


# ---------- endpoint ----------

client = TestClient(app)


def test_endpoint_passes_media_type_rating_and_language():
    with patch.object(gemini_service.GeminiService, "generate_reflection_suggestions", new=AsyncMock(return_value=["好看。"])) as m:
        r = client.post("/api/v1/ai/suggestions", json={"title": "Dune", "synopsis": "s", "media_type": "tv", "rating": 8},
                        headers={"Accept-Language": "en-US"})
    assert r.status_code == 200
    assert r.json() == {"suggestions": ["好看。"]}
    args, kwargs = m.call_args
    assert args[:3] == ("Dune", "s", "en-US")
    assert kwargs.get("media_type") == "tv" and kwargs.get("rating") == 8


def test_endpoint_old_clients_without_new_fields_still_work():
    with patch.object(gemini_service.GeminiService, "generate_reflection_suggestions", new=AsyncMock(return_value=[])) as m:
        r = client.post("/api/v1/ai/suggestions", json={"title": "Dune"})
    assert r.status_code == 200
    assert m.call_args.kwargs.get("media_type") is None and m.call_args.kwargs.get("rating") is None


@pytest.mark.parametrize("body", [
    {"title": "x", "media_type": "podcast"},
    {"title": "x", "rating": 11},
    {"title": "x", "rating": -1},
])
def test_endpoint_rejects_invalid_values(body):
    r = client.post("/api/v1/ai/suggestions", json=body)
    assert r.status_code == 422


# ---------- 模型順序：Flash-Lite → 2.5 Flash → OpenAI ----------

def _two_model_factory(first, second):
    """GenerativeModel(name, ...) 依名稱回傳不同的 mock model。"""
    models = {"gemini-3.1-flash-lite": first, "gemini-2.5-flash": second}
    return MagicMock(side_effect=lambda name, **kw: models[name])


async def _run_chain(first, second, **kw):
    factory = _two_model_factory(first, second)
    with patch.object(settings, "GEMINI_API_KEY", "fake"), patch.object(settings, "OPENAI_API_KEY", ""), \
         patch.object(gemini_service.genai, "configure"), \
         patch.object(gemini_service.genai, "GenerativeModel", new=factory), \
         patch.object(gemini_service, "log_ai_usage") as log:
        out = await gemini_service.GeminiService.generate_reflection_suggestions("Dune", "syn", **kw)
    return out, factory, log


@pytest.mark.asyncio
async def test_flash_lite_is_tried_first_and_flash_is_not_called_on_success():
    lite, flash = _model(json.dumps(["看完還在回味。"])), _model(json.dumps(["不該被用到。"]))
    out, factory, log = await _run_chain(lite, flash, language="zh-TW")
    assert out == ["看完還在回味。"]
    assert [c.args[0] for c in factory.call_args_list] == ["gemini-3.1-flash-lite"]
    flash.generate_content_async.assert_not_called()
    assert log.call_args.kwargs["model"] == "gemini-3.1-flash-lite"


@pytest.mark.asyncio
async def test_falls_back_to_flash_when_flash_lite_errors():
    lite = MagicMock(); lite.generate_content_async = AsyncMock(side_effect=RuntimeError("503"))
    flash = _model(json.dumps(["備援模型的句子。"]))
    out, factory, log = await _run_chain(lite, flash, language="zh-TW")
    assert out == ["備援模型的句子。"]
    assert [c.args[0] for c in factory.call_args_list] == ["gemini-3.1-flash-lite", "gemini-2.5-flash"]
    assert [(c.kwargs["model"], c.kwargs["success"]) for c in log.call_args_list] == [
        ("gemini-3.1-flash-lite", False), ("gemini-2.5-flash", True)]


@pytest.mark.asyncio
async def test_falls_back_to_flash_when_flash_lite_output_is_all_filtered():
    lite = _model(json.dumps(["適合週末看。", "推薦給大家。"]))
    flash = _model(json.dumps(["結尾那一幕我看了兩次。"]))
    out, _, _ = await _run_chain(lite, flash, language="zh-TW")
    assert out == ["結尾那一幕我看了兩次。"]


@pytest.mark.asyncio
async def test_falls_back_when_flash_lite_returns_invalid_json():
    lite = _model("not json at all")
    flash = _model(json.dumps(["好看。"]))
    out, _, _ = await _run_chain(lite, flash, language="zh-TW")
    assert out == ["好看。"]


@pytest.mark.asyncio
async def test_timeout_is_ten_seconds_for_fast_model():
    lite = _model(json.dumps(["好看。"]))
    with patch.object(gemini_service.asyncio, "wait_for", new=AsyncMock(side_effect=lambda coro, timeout: coro)) as wf:
        await _run_chain(lite, lite, language="zh-TW")
    assert wf.call_args.kwargs["timeout"] == 10.0


# ---------- refine_reflection 也使用 Flash-Lite ----------

@pytest.mark.asyncio
async def test_refine_reflection_uses_flash_lite():
    model = _model("潤飾後的句子。")
    with patch.object(settings, "GEMINI_API_KEY", "fake"), patch.object(settings, "OPENAI_API_KEY", ""), \
         patch.object(gemini_service.genai, "configure"), \
         patch.object(gemini_service.genai, "GenerativeModel", return_value=model) as gm, \
         patch.object(gemini_service, "log_ai_usage") as log:
        out = await gemini_service.GeminiService.refine_reflection("原本的心得", "zh-TW")
    assert out == "潤飾後的句子。"
    assert gm.call_args.args[0] == "gemini-3.1-flash-lite"
    assert log.call_args.kwargs["model"] == "gemini-3.1-flash-lite"
    assert log.call_args.kwargs["endpoint"] == "reflection_refine"
