import { dayStats, plannedItemDone, plannedOf } from './historyStats';
import { isMetricDone, metricCountsInDay, metricNumericValue, metricSchedule, plannedSetsFor, setsCount } from './historyMetrics';
import { addDaysIso, fmtDate, mondayOf, parseIso } from './date';
export const COVERAGE_MIN = 0.6; // доля отслеженных дней, ниже которой период не сравниваем
export const MIN_TRACKED_DAYS = 3; // меньше отслеженных дней — сводку не строим («пока мало данных»)
export const MIN_METRIC_DAYS = 3; // меньше дней у метрики в периоде — «мало данных» по ней
export const SHARE_DELTA_MIN = 0.1; // изменение доли дней на 10 п.п. и больше — «лучше/хуже»
export const AVG_DELTA_MIN = 0.1; // изменение среднего на 10% и больше — нейтральная стрелка
export function periodRange(kind, anchor) {
    if (kind === 'week') {
        const start = mondayOf(anchor);
        return { kind, start, end: addDaysIso(start, 6) };
    }
    const d = parseIso(anchor);
    if (kind === 'month') {
        return { kind, start: fmtDate(new Date(d.getFullYear(), d.getMonth(), 1)), end: fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
    }
    return { kind, start: fmtDate(new Date(d.getFullYear(), 0, 1)), end: fmtDate(new Date(d.getFullYear(), 11, 31)) };
}
// Соседний период (delta = -1 — прошлый, +1 — следующий)
export function shiftPeriod(r, delta) {
    if (r.kind === 'week')
        return periodRange('week', addDaysIso(r.start, 7 * delta));
    const d = parseIso(r.start);
    if (r.kind === 'month')
        return periodRange('month', fmtDate(new Date(d.getFullYear(), d.getMonth() + delta, 1)));
    return periodRange('year', fmtDate(new Date(d.getFullYear() + delta, 0, 1)));
}
function daysIn(start, end) {
    const out = [];
    for (let d = start; d <= end; d = addDaysIso(d, 1))
        out.push(d);
    return out;
}
// В день есть хоть какая-то запись: значение метрики или пункт плана. Пустой день (ничего не вносили) «отслеженным» не считается.
export function isTrackedDay(ctx, dateStr) {
    const vals = ctx.byDate?.[dateStr];
    if (vals) {
        for (const k of Object.keys(vals)) {
            const v = vals[k];
            if (v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
                return true;
        }
    }
    return plannedOf(ctx, dateStr).length > 0;
}
export function periodTotals(ctx, range, full) {
    const first = ctx.firstDate;
    const last = range.end < ctx.today ? range.end : ctx.today;
    const lo = !full && first && first > range.start ? first : range.start;
    const possible = full ? daysIn(range.start, range.end).length : first && lo <= last ? daysIn(lo, last).length : 0;
    let tracked = 0;
    let scored = 0;
    let pctSum = 0;
    let perfect = 0;
    let workoutDays = 0;
    let planGoalsDone = 0;
    if (first && range.start <= last) {
        for (const d of daysIn(range.start > first ? range.start : first, last)) {
            if (isTrackedDay(ctx, d))
                tracked++;
            const st = dayStats(ctx, d);
            if (st.total > 0 || st.bonusPct > 0) {
                scored++;
                pctSum += Math.min(100, st.pct);
                if (st.pct >= 100)
                    perfect++;
            }
            const vals = ctx.byDate?.[d] || {};
            if (ctx.metrics.some((m) => m.type === 'sets' && setsCount(vals[m.id]) > 0))
                workoutDays++;
            for (const item of plannedOf(ctx, d))
                if (item.type === 'goal' && plannedItemDone(ctx, item) === true)
                    planGoalsDone++;
        }
    }
    return {
        possible,
        tracked,
        coverage: possible > 0 ? tracked / possible : 0,
        scoredDays: scored,
        avgPct: scored > 0 ? Math.round(pctSum / scored) : null,
        perfectDays: perfect,
        workoutDays,
        planGoalsDone,
    };
}
function hasGoal(m) {
    if (m.type === 'boolean' || m.type === 'multiselect')
        return true;
    return (m.goal_value ?? 0) > 0 || plannedSetsFor(m) != null;
}
function comparable(m) {
    const sc = metricSchedule(m);
    return sc?.type !== 'weekly' && sc?.type !== 'at_most';
}
function metricStat(ctx, m, range) {
    const first = ctx.firstDate;
    if (!first)
        return null;
    const last = range.end < ctx.today ? range.end : ctx.today;
    const from = range.start > first ? range.start : first;
    if (from > last)
        return null;
    const goal = hasGoal(m);
    let counted = 0;
    let done = 0;
    let sum = 0;
    let nVals = 0;
    for (const d of daysIn(from, last)) {
        if (!isTrackedDay(ctx, d))
            continue;
        const v = (ctx.byDate?.[d] || {})[m.id];
        const isDone = isMetricDone(m, v, d);
        if (goal) {
            if (!metricCountsInDay(m, d, isDone))
                continue; // не по расписанию и не сделана / пропущенный день — не считаем
            counted++;
            if (isDone)
                done++;
        }
        else {
            const num = metricNumericValue(m, v);
            if (num == null)
                continue;
            nVals++;
            sum += num;
        }
    }
    if (goal)
        return counted > 0 ? { kind: 'share', value: done / counted, n: counted } : null;
    return nVals > 0 ? { kind: 'avg', value: sum / nVals, n: nVals } : null;
}
export function compareMetrics(ctx, cur, prev) {
    const out = { better: [], worse: [], neutral: [], same: [], insufficient: [] };
    for (const m of ctx.metrics) {
        if (!comparable(m))
            continue;
        const a = metricStat(ctx, m, cur);
        const b = metricStat(ctx, m, prev);
        if (!a || !b || a.n < MIN_METRIC_DAYS || b.n < MIN_METRIC_DAYS) {
            out.insufficient.push({ id: m.id, name: m.name, icon: m.icon });
            continue;
        }
        if (a.kind === 'share') {
            const delta = a.value - b.value;
            const base = { id: m.id, name: m.name, icon: m.icon, kind: 'share', cur: a.value, prev: b.value, delta, direction: delta >= 0 ? 'up' : 'down', unit: m.unit };
            if (Math.abs(delta) < SHARE_DELTA_MIN) {
                out.same.push({ ...base, tone: 'neutral' });
                continue;
            }
            ;
            (delta > 0 ? out.better : out.worse).push({ ...base, tone: delta > 0 ? 'good' : 'bad' });
        }
        else {
            if (b.value === 0) {
                out.insufficient.push({ id: m.id, name: m.name, icon: m.icon });
                continue;
            }
            const delta = (a.value - b.value) / Math.abs(b.value);
            const t = { id: m.id, name: m.name, icon: m.icon, kind: 'avg', cur: a.value, prev: b.value, delta, direction: delta >= 0 ? 'up' : 'down', tone: 'neutral', unit: m.unit };
            (Math.abs(delta) < AVG_DELTA_MIN ? out.same : out.neutral).push(t);
        }
    }
    const byBig = (x, y) => Math.abs(y.delta) - Math.abs(x.delta);
    out.better.sort(byBig);
    out.worse.sort(byBig);
    out.neutral.sort(byBig);
    return out;
}
export function summarizePeriod(ctx, range) {
    const prevRange = shiftPeriod(range, -1);
    const cur = periodTotals(ctx, range, false);
    const prev = periodTotals(ctx, prevRange, true);
    const state = !ctx.firstDate || cur.tracked === 0 ? 'empty' : cur.tracked < MIN_TRACKED_DAYS ? 'few' : 'ok';
    let compareBlock = null;
    if (state === 'ok') {
        if (prev.tracked === 0)
            compareBlock = 'no_prev';
        else if (cur.coverage < COVERAGE_MIN || prev.coverage < COVERAGE_MIN)
            compareBlock = 'coverage';
    }
    const compare = state === 'ok' && compareBlock === null;
    return { range, prevRange, state, cur, prev, compare, compareBlock, metrics: compare ? compareMetrics(ctx, range, prevRange) : null };
}
