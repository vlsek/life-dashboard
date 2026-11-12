import { ref } from 'vue';
import { sb } from './supabase';
import { addDaysIso, fmtDate } from './date';
import { groupLifeEvents } from './lifeEvents';
import { groupDeadlines, normalizePlanned } from './calendar';
import { HORIZON_DAYS, buildToday } from './todaySummary';
import { friendlyError } from './friendlyError';
// Тот же паттерн session/onboarded redirect, что и в useMilestones.ts (web-milestones/) —
// портировано из requireAuth()/requireOnboarded() в config.js.
export function useCalendar() {
    const auth = ref({ status: 'loading' });
    const byDate = ref({});
    const deadlines = ref({});
    const events = ref({}); // «события жизни» (76.1): тренировки, дни челленджей, сроки вех
    const error = ref(null);
    async function init() {
        const { data } = await sb.auth.getSession();
        const session = data.session;
        if (!session) {
            auth.value = { status: 'redirecting' };
            window.location.href = '/login/';
            return;
        }
        const userId = session.user.id;
        const userEmail = session.user.email ?? null;
        const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle();
        if (!profile?.onboarded) {
            auth.value = { status: 'redirecting' };
            window.location.href = '/onboarding/';
            return;
        }
        auth.value = { status: 'ready', userId, userEmail };
    }
    async function loadMonth(userId, year, month) {
        const from = fmtDate(new Date(year, month, 1));
        const to = fmtDate(new Date(year, month + 1, 0));
        const [notesRes, goalsRes] = await Promise.all([
            sb.from('daily_notes').select('date, planned_goals').eq('user_id', userId).gte('date', from).lte('date', to),
            sb.from('goals').select('id, name, done, deadline').eq('user_id', userId).gte('deadline', from).lte('deadline', to),
        ]);
        const { data, error: err } = notesRes;
        if (err) {
            error.value = friendlyError(err, 'load');
            return;
        }
        error.value = null;
        const next = {};
        for (const n of data || [])
            next[n.date] = normalizePlanned(n.planned_goals);
        byDate.value = next;
        // ошибка чтения целей календарь не ломает: просто нет маркеров сроков
        deadlines.value = goalsRes.error ? {} : groupDeadlines(goalsRes.data);
        await loadEvents(userId, from, to);
    }
    // Чужие разделы только на чтение; любая ошибка просто убирает точки событий — календарь и планы не затрагиваются
    async function loadEvents(userId, from, to) {
        try {
            const [wRes, eRes, mRes] = await Promise.all([
                sb.from('workout_entries').select('date').eq('user_id', userId).gte('date', from).lte('date', to),
                sb.from('challenge_entries').select('date, challenge_id').eq('user_id', userId).gte('date', from).lte('date', to),
                sb.from('milestones').select('id, name, due_date').eq('user_id', userId).gte('due_date', from).lte('due_date', to),
            ]);
            const entries = eRes.error ? [] : eRes.data || [];
            const ids = [...new Set(entries.map((e) => e.challenge_id))];
            let instances = [];
            if (ids.length) {
                const iRes = await sb.from('challenge_instances').select('id, title, start_date').in('id', ids);
                if (!iRes.error)
                    instances = iRes.data || [];
            }
            events.value = groupLifeEvents({
                workouts: wRes.error ? [] : wRes.data,
                challengeEntries: entries,
                instances,
                milestones: mRes.error ? [] : mRes.data,
            });
        }
        catch {
            events.value = {};
        }
    }
    // Карточка «Сегодня» (44.8 срез 4): свой запрос — не зависит от того, какой месяц листает сетка. Ошибка чтения = карточки нет, страница работает.
    const today = ref(null);
    async function loadToday(userId, todayIso) {
        const [noteRes, goalsRes] = await Promise.all([
            sb.from('daily_notes').select('planned_goals').eq('user_id', userId).eq('date', todayIso).maybeSingle(),
            sb.from('goals').select('id, name, done, deadline').eq('user_id', userId).eq('done', false).not('deadline', 'is', null).lte('deadline', addDaysIso(todayIso, HORIZON_DAYS)),
        ]);
        if (noteRes.error || goalsRes.error) {
            today.value = null;
            return;
        }
        today.value = buildToday(todayIso, normalizePlanned(noteRes.data?.planned_goals), (goalsRes.data ?? []));
    }
    async function savePlanned(userId, dateStr, planned) {
        const { error: err } = await sb.from('daily_notes').upsert({ user_id: userId, date: dateStr, planned_goals: planned }, { onConflict: 'user_id,date' });
        if (err)
            throw err;
        byDate.value = { ...byDate.value, [dateStr]: planned };
    }
    // Перенос пункта плана на другой день (76.4): целевой день читается из базы (он может быть вне показанного месяца).
    // Порядок записи: сначала целевой день, потом исходный — при сбое второй записи пункт лишь продублируется, но не пропадёт.
    async function movePlanned(userId, from, to, remaining, moved) {
        const { data, error: err } = await sb.from('daily_notes').select('planned_goals').eq('user_id', userId).eq('date', to).maybeSingle();
        if (err)
            throw err;
        await savePlanned(userId, to, [...normalizePlanned(data?.planned_goals), { type: 'custom', text: moved.text, done: false }]);
        await savePlanned(userId, from, remaining);
    }
    return { auth, byDate, deadlines, events, error, today, init, loadMonth, loadToday, savePlanned, movePlanned };
}
