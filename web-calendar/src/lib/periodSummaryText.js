import { addDaysIso, parseIso } from './date';
import { locale, t } from './i18n';
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
export function periodTitle(r) {
    const loc = locale();
    if (r.kind === 'year')
        return String(parseIso(r.start).getFullYear());
    if (r.kind === 'month')
        return parseIso(r.start).toLocaleDateString(loc, { month: 'long', year: 'numeric' });
    const f = (iso) => parseIso(iso).toLocaleDateString(loc, { day: 'numeric', month: 'short' });
    return `${f(r.start)} – ${f(addDaysIso(r.start, 6))}`;
}
// «▲ +6 п.п.» — знак и стрелка, не только цвет
export function signedPoints(delta) {
    const n = Math.round(delta);
    if (n === 0)
        return '= 0';
    return `${n > 0 ? '▲ +' : '▼ −'}${Math.abs(n)}`;
}
export function trendValue(m) {
    if (m.kind === 'share')
        return `${Math.round(m.prev * 100)}% → ${Math.round(m.cur * 100)}%`;
    const f = (v) => (Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace('.', locale() === 'en-US' ? '.' : ','));
    return `${f(m.prev)} → ${f(m.cur)}${m.unit ? ' ' + m.unit : ''}`;
}
export function trendDelta(m) {
    if (m.kind === 'share')
        return `${signedPoints(m.delta * 100)} ${t('sum_pp')}`;
    return `${m.direction === 'up' ? '▲ +' : '▼ −'}${Math.round(Math.abs(m.delta) * 100)}%`;
}
export function buildStory(s) {
    if (s.state !== 'ok')
        return null;
    const parts = [];
    let cmp = '';
    if (s.compare) {
        const d = s.cur.perfectDays - s.prev.perfectDays;
        cmp = d === 0 ? t('sum_story_same') : fill(d > 0 ? t('sum_story_more') : t('sum_story_less'), { k: Math.abs(d) });
    }
    parts.push(fill(t('sum_story_perfect'), { n: s.cur.perfectDays, cmp }));
    const best = s.metrics?.better[0];
    const worst = s.metrics?.worse[0];
    if (best)
        parts.push(fill(t('sum_story_best'), { name: best.name }));
    if (worst)
        parts.push(fill(t('sum_story_worst'), { name: worst.name }));
    return parts.join(' ');
}
