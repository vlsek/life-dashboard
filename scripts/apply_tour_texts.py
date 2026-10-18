#!/usr/bin/env python3
"""Единый источник текстов тура (tour_1..7_text) для всех пилотов.

Тур копируется в словарь каждого пилота (`web-*/src/lib/i18n.ts`, ключи tour_1_text … tour_7_text: сначала EN, потом RU). Править его
вручную в 15 местах нельзя — копии разойдутся. Тексты живут здесь; скрипт переписывает значения во всех словарях, где такие ключи есть.
Идемпотентен: повторный запуск пишет «изменено файлов: 0». Тест `web-dashboard/src/tourTexts.test.ts` проверяет это (и значит, что
тексты не правили руками мимо генератора).

Источник формулировок — docs/TEXT_SHORTENING.md (BACKLOG 935/49.5, одобрено владельцем 2026-10-17): на «ты», короче; EN — зеркально.
Корневой i18n.js (словарь старых legacy/*.html) не трогаем: живые страницы берут тур из словарей пилотов.

Запуск:  python3 scripts/apply_tour_texts.py          (записывает)
         python3 scripts/apply_tour_texts.py --check  (только проверка, код выхода 1, если что-то разошлось)
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEXTS = {
    'ru': {
        1: 'Это твой личный дашборд: привычки, цели, навыки, тренировки и прогресс в одном месте.\n\nТур — 7 коротких шагов; открыть его снова можно в меню («Как пользоваться»).',
        2: 'Каждый день отмечай метрики и добавляй пункты в «Запланировано на сегодня». Кружок — выполнение дня, огонёк — серия, баллы копятся за сделанное. ⚙️ у блоков — что показывать.',
        3: 'Цели — в разделе «Цели»: разбивай большую на этапы и добавляй в план на сегодня — она пойдёт в счёт дня и недели.',
        4: '🥋 Навыки — что осваиваешь, с прогрессом и книгами.\n🏋️ Тренировки — упражнения и подходы, готовые программы.\n🌐 Языки — словарь: добавляй слова, отмечай выученные.',
        5: '🏁 Челленджи — готовые из каталога или свои.\n🛍️ Магазин — трать баллы на то, что «разрешаешь себе купить».\n🏆 Сообщество — друзья и лидерборд; другие видят только то, что ты разрешил.',
        6: 'Нажми на день в календаре — запиши план или заметку, они попадут в итог этого дня.\n\n🚩 Вехи — регулярные дела с датой (замена масла): отметь, когда сделал, и раздел подскажет, когда пора снова.',
        7: '☰ — меню (язык, тема, аккаунт, установка). »»» — быстрые ссылки на разделы. 💧 — трекер воды, в том числе за прошлые дни.\n\nВот и всё — приятного пользования!',
    },
    'en': {
        1: 'This is your personal dashboard: habits, goals, skills, workouts and progress in one place.\n\nThe tour is 7 short steps; you can reopen it any time from the menu ("How it works").',
        2: 'Every day, tick off your metrics and add items to "Planned for today". The circle shows how much of the day is done, the flame is your streak, and points add up for what you finish. The ⚙️ icons by blocks control what is shown.',
        3: "Goals live in the Goals section: split a big one into stages and add it to today's plan — it then counts toward your day and week.",
        4: "🥋 Skills — what you are mastering, with progress and books.\n🏋️ Workouts — exercises and sets, ready-made programs.\n🌐 Languages — a vocabulary: add words, mark the ones you've learned.",
        5: '🏁 Challenges — ready-made ones from the catalog, or your own.\n🛍️ Shop — spend points on things you "allow yourself to buy".\n🏆 Community — friends and a leaderboard; others only see what you allow.',
        6: "Tap a day in the calendar — write a plan or a note, and it goes into that day's summary.\n\n🚩 Milestones — recurring things with a date (an oil change): mark when you did it, and the page tells you when it's due again.",
        7: '☰ — the menu (language, theme, account, install). »»» — quick links to sections. 💧 — the water tracker, including past days.\n\nThat\'s it — enjoy!',
    },
}


def js_literal(s: str) -> str:
    """Одинарные кавычки, как в словарях пилотов; перевод строки — \\n; апостроф и обратный слэш экранируются."""
    s = s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
    return "'" + s + "'"


# Значение может стоять на той же строке, что и ключ, или (длинные строки, как их переносит prettier) на следующей, с отступом.
STR = r"""(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")"""
KEY_RE = re.compile(
    r'^(?P<indent>[ \t]*)(?P<key>tour_(?P<n>[1-7])_text):(?P<sep>[ \t]*\n[ \t]*|[ \t]+)(?P<val>' + STR + r')(?P<comma>,?)',
    re.M,
)


def process(path: str, write: bool) -> bool:
    src = open(path, encoding='utf-8').read()
    seen = {}  # n -> сколько раз ключ уже встретился (0 → EN, 1 → RU)

    def repl(m):
        n = int(m.group('n'))
        idx = seen.get(n, 0)
        seen[n] = idx + 1
        lang = 'en' if idx == 0 else 'ru'
        if idx > 1:
            return m.group(0)
        return f"{m.group('indent')}{m.group('key')}:{m.group('sep')}{js_literal(TEXTS[lang][n])}{m.group('comma')}"

    out = KEY_RE.sub(repl, src)
    if out != src and write:
        open(path, 'w', encoding='utf-8', newline='').write(out)
    return out != src


def main():
    write = '--check' not in sys.argv
    changed = []
    for path in sorted(glob.glob(os.path.join(ROOT, 'web-*', 'src', 'lib', 'i18n.ts'))):
        if process(path, write):
            changed.append(os.path.relpath(path, ROOT))
    print(f'изменено файлов: {len(changed)}')
    for c in changed:
        print('  ' + c)
    if not write and changed:
        sys.exit(1)


if __name__ == '__main__':
    main()
