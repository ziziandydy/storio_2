"""App Store 截圖用的假後端（只在本機 8011）：全部是虛構作品，海報來自 gen-posters.mjs 產生的 fake/。
真實 App（Next dev，NEXT_PUBLIC_API_URL=http://localhost:8011，localStorage E2E_TEST=true）打這個後端，
所以截到的是真實 UI＋虛構資料。
  python3 marketing/app-store-screenshots/mock-api.py
"""
import json
import os
import uuid
from datetime import date, datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
FAKE = os.path.join(HERE, 'fake')
BASE = 'http://localhost:8011'
USER = str(uuid.uuid5(uuid.NAMESPACE_DNS, 'storio-demo'))


def poster(i):
    return f'{BASE}/fake/{i}.jpg'


# id, 類型, 標題, 年份, 收藏日, 評分, 心得, 季數
WORKS = [
    ('movie_0', 'movie', 'The Last Lighthouse', 2025, '2026-01-04', 9, 'The final shot stayed with me for days.', None),
    ('series_1', 'tv', 'The Tide Archive', 2025, '2026-01-19', 8, 'Slow, strange and impossible to stop.', [1]),
    ('book_0', 'book', 'The Salt Almanac', 2024, '2026-11-01', 9, 'Read it in one weekend by the window.', None),
    ('movie_2', 'movie', 'Neon Harbor', 2026, '2026-11-06', 7, 'Pure atmosphere. Great soundtrack.', None),
    ('series_0', 'tv', 'Hollow Crown County', 2024, '2026-11-03', 10, 'Season two is somehow even better.', [1, 2]),
    ('movie_1', 'movie', 'Paper Moons', 2026, '2026-03-28', 8, '', None),
    ('book_2', 'book', 'Letters to the Lighthouse', 2023, '2026-04-09', 8, '', None),
    ('series_4', 'tv', 'Parallel Hours', 2025, '2026-05-03', 9, '', [1, 2, 3]),
    ('movie_3', 'movie', 'Quiet Orbit', 2025, '2026-11-05', 9, 'Silence has never been this loud.', None),
    ('book_4', 'book', 'The Quiet Orchard', 2022, '2026-06-14', 7, '', None),
    ('movie_4', 'movie', 'Salt & Ember', 2026, '2026-07-06', 8, '', None),
    ('series_3', 'tv', 'Afterglow Society', 2025, '2026-07-30', 9, '', [1]),
    ('movie_5', 'movie', 'Glass Summer', 2026, '2026-08-17', 8, '', None),
    ('book_1', 'book', 'A Map of Small Hours', 2021, '2026-11-08', 9, '', None),
    ('movie_6', 'movie', 'Night Shift', 2026, '2026-11-04', 10, 'Watched it twice in one week.', None),
    ('series_5', 'tv', 'Cedar Falls Diaries', 2023, '2026-11-02', 8, '', [5, 6]),
    ('series_2', 'tv', 'Northline', 2025, '2026-11-09', 9, '', [4]),
    ('movie_7', 'movie', 'The Map Maker', 2026, '2026-11-10', 8, '', None),
]
BY_ID = {w[0]: w for w in WORKS}
# 訪客上限 10 部：App 內收藏頁顯示 10 / 10，所以收藏清單只放 10 部（Recap 的數字與此一致）
COLLECTION_IDS = ['movie_0', 'series_1', 'book_0', 'movie_2', 'series_0', 'movie_3', 'book_1', 'movie_6', 'series_2', 'movie_7']


def base(w):
    wid, kind, title, year, *_ = w
    return {
        'title': title, 'media_type': kind, 'subtype': None, 'year': year,
        'external_id': wid, 'poster_path': poster(wid), 'source': 'books' if kind == 'book' else 'tmdb', 'rating': 0, 'notes': None,
    }


def story(w):
    wid, kind, title, year, d, rating, notes, seasons = w
    out = base(w)
    out.update({
        'id': str(uuid.uuid5(uuid.NAMESPACE_DNS, wid)), 'user_id': USER, 'viewing_number': 1,
        'created_at': f'{d}T12:00:00+00:00', 'archived_date': d, 'seasons': seasons, 'related_instances': [],
        'rating': rating, 'notes': notes or None,
        'runtime_minutes': 120 if kind == 'movie' else 50, 'episode_total': 10 if kind == 'tv' else None,
        'genres': ['Drama'] if kind != 'book' else ['Fiction'], 'page_count': 320 if kind == 'book' else None,
    })
    return out


def detail(wid, kind):
    w = BY_ID.get(wid) or next((x for x in WORKS if x[1] == kind), WORKS[0])
    out = base(w)
    seasons = [{'season_number': n, 'name': f'Season {n}', 'air_date': f'202{n % 5}-09-01', 'episode_count': 8 + n % 3, 'vote_average': 8.1}
               for n in range(1, 7)] if w[1] == 'tv' else []
    out.update({
        'overview': 'A quiet coastal town keeps a secret older than its lighthouse. When the tide goes out, the story begins.',
        'synopsis': None, 'genres': ['Drama', 'Mystery'], 'status': 'Released',
        'streaming_providers': [], 'reviews': [], 'top_reviews': [],
        'cast': ['Mara Ellison', 'Theo Navarro', 'June Okafor', 'Ilan Weiss', 'Sora Mitchell'],
        'directors': ['M. Arden'], 'authors': ['Elena Marsh'] if w[1] == 'book' else [],
        'production_companies': [], 'origin_country': 'US', 'original_language': 'en', 'spoken_languages': ['English'],
        'quotes': [], 'related_media': [], 'runtime': '1h 58m' if w[1] == 'movie' else None, 'public_rating': 8.4,
        'backdrop_path': f'{BASE}/fake/bd_{w[0]}.jpg', 'cast_refs': [], 'director_refs': [], 'genre_refs': [], 'company_refs': [], 'seasons': seasons,
        'page_count': 320 if w[1] == 'book' else None,
    })
    return out


def recap():
    P = [poster(w[0]) for w in WORKS if w[1] != 'book'][:8]
    allp = [poster(w[0]) for w in WORKS]
    return {
        'year': 2026, 'is_partial': True, 'total_count': 10, 'metadata_pending': 0,
        'opening': {'year': 2026},
        'total': {'count': 10, 'minutes': 4300, 'items_with_data': 10, 'estimated': False, 'posters': allp},
        'movies': {'count': 5, 'minutes': 600, 'items_with_data': 5, 'estimated': False, 'posters': P[:6]},
        'series': {'count': 3, 'minutes': 2300, 'items_with_data': 3, 'estimated': False, 'posters': P[:6], 'episodes': 36},
        'books': {'count': 2, 'minutes': 700, 'items_with_data': 2, 'estimated': True, 'posters': [poster('book_0'), poster('book_1')], 'pages': 640},
        'genres': {'top': [{'name': 'Drama', 'count': 6}, {'name': 'Mystery', 'count': 3}, {'name': 'Sci-Fi', 'count': 2}], 'posters': P[:6]},
        'eras': {'decades': [{'decade': 1990, 'count': 2}, {'decade': 2000, 'count': 2}, {'decade': 2010, 'count': 3}, {'decade': 2020, 'count': 3}], 'posters': P[:6]},
        'title': {'id': 'tension_watcher', 'zh': '張力觀察家', 'en': 'The Tension Watcher', 'posters': P[:6]},
        'monthly': {'counts': [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 2, 0], 'posters': P[:6]},
        'peak_month': {'month': 11, 'count': 2, 'posters': P[:6]},
        'months_active': {'count': 8, 'posters': allp[:8]},
        'top_rated': {'rating': 10, 'count': 2, 'items': [{'title': 'Hollow Crown County', 'poster_path': poster('series_0')}, {'title': 'Night Shift', 'poster_path': poster('movie_6')}]},
        'first_last': {
            'first': {'title': 'The Last Lighthouse', 'poster_path': poster('movie_0'), 'date': '2026-01-04'},
            'last': {'title': 'The Map Maker', 'poster_path': poster('movie_7'), 'date': '2026-11-10'},
        },
        'reflection': {'count': 3, 'candidates': [
            {'id': 'r1', 'title': 'Night Shift', 'poster_path': poster('movie_6'), 'rating': 10, 'text': 'Watched it twice in one week.'},
            {'id': 'r2', 'title': 'The Last Lighthouse', 'poster_path': poster('movie_0'), 'rating': 9, 'text': 'The final shot stayed with me for days.'},
        ]},
        'closing': {},
    }


class H(BaseHTTPRequestHandler):
    def _send(self, status, body=None, ctype='application/json'):
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', '*')
        if body is not None:
            data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            self.end_headers()

    def do_OPTIONS(self):
        self._send(204)

    def do_POST(self):
        self._send(204)

    def do_GET(self):
        url = urlparse(self.path)
        p = url.path.rstrip('/')
        q = parse_qs(url.query)
        if p.startswith('/fake/'):
            f = os.path.join(FAKE, os.path.basename(unquote(p)))
            if os.path.exists(f):
                return self._send(200, open(f, 'rb').read(), 'image/jpeg')
            return self._send(404)
        if p == '/api/v1/proxy/image':
            u = (q.get('url') or [''])[0]
            f = os.path.join(FAKE, os.path.basename(unquote(urlparse(u).path)))
            if os.path.exists(f):
                return self._send(200, open(f, 'rb').read(), 'image/jpeg')
            return self._send(404)
        if p == '/api/v1/collection':
            return self._send(200, [story(BY_ID[i]) for i in COLLECTION_IDS])
        if p == '/api/v1/collection/stats':
            days7 = [{'date': f'2026-11-{d:02d}', 'count': d % 3} for d in range(5, 12)]
            days30 = [{'date': f'2026-10-{d:02d}', 'count': d % 2} for d in range(12, 32)] + days7
            return self._send(200, {'total_count': 10, 'last_7_days': 3, 'last_14_days': 4, 'last_30_days': 8, 'this_week': 2, 'this_month': 3,
                                    'this_year': 10, 'daily_counts_7d': days7, 'daily_counts_30d': days30})
        if p == '/api/v1/collection/recap/years':
            return self._send(200, {'threshold': 3, 'years': [{'year': 2026, 'count': 10}], 'current': {'year': 2026, 'count': 10}})
        if p == '/api/v1/collection/recap':
            return self._send(200, recap())
        if p.startswith('/api/v1/collection/check/'):
            return self._send(200, {'exists': False, 'instances': []})
        if p.startswith('/api/v1/search/trending/'):
            kind = p.rsplit('/', 1)[1]
            want = {'movies': 'movie', 'series': 'tv', 'books': 'book'}[kind]
            return self._send(200, [base(w) for w in WORKS if w[1] == want] * 2)
        if p == '/api/v1/search':
            term = (q.get('q') or [''])[0].lower()
            want = (q.get('filter') or q.get('type') or [''])[0]
            hits = [w for w in WORKS if not term or term in w[2].lower()] or WORKS[:6]
            return self._send(200, {'results': [base(w) for w in hits], 'page': 1, 'total_results': len(hits)})
        if p.startswith('/api/v1/details/'):
            _, _, _, _, kind, wid = p.split('/')[:6]
            return self._send(200, detail(wid, kind))
        return self._send(200, {})

    def log_message(self, *a):
        pass


ThreadingHTTPServer(('0.0.0.0', 8011), H).serve_forever()
