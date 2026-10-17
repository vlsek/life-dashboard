#!/usr/bin/env bash
# Ребейз на origin/main + пересборка пилотов. Против гонки собранных папок: пока вы собираете, другой агент выпускает версию и
# пересобирает все пилоты, и ваш push отклоняется, а `git pull --rebase` конфликтует в dashboard/assets/index-*.js и т. п.
#
# Что делает:
#   1. `git fetch`, запоминает базу, `git pull --rebase`.
#   2. Конфликты ТОЛЬКО в собранных папках (outDir из web-*/vite.config.ts) — берёт версию upstream (в rebase это `--ours`)
#      и идёт дальше. Конфликт в ИСХОДНИКАХ (web-*/, scripts/, config.js, docs/, COORDINATION.md …) — НЕ трогает: останавливается,
#      печатает список, rebase остаётся открытым — решайте руками (git status; потом снова этот скрипт или `git rebase --continue`).
#   3. `python3 scripts/apply_themes.py` (если сообщит «изменено файлов» > 0 — файлы тем разошлись, смотрите git status).
#   4. Пересобирает (`npm run build`, это vue-tsc + vite) пилоты, у которых менялись исходники — у upstream ИЛИ у вас
#      (shared/ считается изменением всех пилотов). Можно задать список вручную: PILOTS="workouts dashboard" scripts/rebase_rebuild.sh
#   5. Коммитит собранное одним коммитом «WIP rebuilt on merged sources».
#
# Чего НЕ делает: не пушит, не поднимает версию, не трогает config.js / CHANGELOG / ROADMAP / BACKLOG / COORDINATION. Версию берите
# ПОСЛЕ этого скрипта (git fetch → SITE_VERSION в origin/main + 1), оформляйте релизным коммитом и пушьте сразу; если `git fetch`
# показывает, что вперёд ушли новые коммиты с релизом, — снимите релизный коммит (`git reset --hard HEAD~1`) и запустите скрипт снова.
#
# Нужны node_modules в пилотах (`npm ci` в web-<пилот>); пилот без node_modules пропускается с предупреждением.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 2

pilot_of_dir() { # web-<x> -> выходная папка (outDir) из vite.config.ts
  grep -o "outDir: *'[^']*'" "$1/vite.config.ts" 2>/dev/null | head -1 | sed "s/.*'\.\.\/\(.*\)'/\1/"
}

declare -A OUT=()
for d in web-*/; do
  d=${d%/}
  o=$(pilot_of_dir "$d")
  [ -n "$o" ] && OUT[$d]=$o
done
OUTDIRS=" ${OUT[*]} "

is_built_path() { # файл лежит в собранной папке?
  local top=${1%%/*}
  [[ "$OUTDIRS" == *" $top "* ]]
}

git fetch -q || { echo "git fetch не удался"; exit 2; }
OLDBASE=$(git merge-base HEAD origin/main)
MINE=$(git diff --name-only "$OLDBASE" HEAD)
THEIRS=$(git diff --name-only "$OLDBASE" origin/main)

if [ "$(git rev-list --count HEAD..origin/main)" != "0" ]; then
  git pull --rebase >/dev/null 2>&1
  for _ in $(seq 1 30); do
    U=$(git diff --name-only --diff-filter=U)
    [ -z "$U" ] && break
    BAD=$(echo "$U" | while read -r f; do is_built_path "$f" || echo "$f"; done)
    if [ -n "$BAD" ]; then
      echo "КОНФЛИКТ В ИСХОДНИКАХ — rebase остановлен, решайте руками:"
      echo "$BAD"
      exit 1
    fi
    for f in $U; do
      git checkout --ours -- "$f" 2>/dev/null || git rm -q --cached "$f" 2>/dev/null
    done
    git add -A $(for d in "${!OUT[@]}"; do echo "${OUT[$d]}"; done | sort -u) 2>/dev/null
    GIT_EDITOR=true git rebase --continue >/dev/null 2>&1
  done
  if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
    echo "rebase не завершён — смотрите git status"; exit 1
  fi
else
  echo "origin/main не ушёл вперёд — ребейз не нужен"
fi

python3 scripts/apply_themes.py | head -1

# какие пилоты пересобирать
if [ -n "${PILOTS:-}" ]; then
  TODO=$PILOTS
else
  TODO=$(printf '%s\n%s\n' "$MINE" "$THEIRS" | while read -r f; do
    case "$f" in
      shared/*) for d in "${!OUT[@]}"; do echo "${d#web-}"; done ;;
      web-*/*) t=${f%%/*}; echo "${t#web-}" ;;
    esac
  done | sort -u | tr '\n' ' ')
fi
echo "пересобираю: ${TODO:-ничего}"

FAILED=""
for p in $TODO; do
  d="web-$p"
  if [ ! -d "$d/node_modules" ]; then echo "ПРОПУСК $p: нет node_modules (cd $d && npm ci)"; FAILED="$FAILED $p"; continue; fi
  if (cd "$d" && timeout 280 npm run build > "/tmp/rebuild_$p.log" 2>&1); then echo "  $p: ок"; else echo "  $p: СБОРКА УПАЛА (лог /tmp/rebuild_$p.log)"; FAILED="$FAILED $p"; fi
done

git add -A $(for d in "${!OUT[@]}"; do echo "${OUT[$d]}"; done | sort -u) 2>/dev/null
if ! git diff --cached --quiet; then git commit -q -m "WIP rebuilt on merged sources"; echo "закоммичена пересборка"; fi

git fetch -q
echo "позади origin/main на $(git rev-list --count HEAD..origin/main) коммит(ов); SITE_VERSION в origin/main: $(git show origin/main:config.js | grep -o 'SITE_VERSION = "[0-9.]*"')"
[ -n "$FAILED" ] && { echo "ВНИМАНИЕ: не собраны:$FAILED"; exit 1; }
exit 0
