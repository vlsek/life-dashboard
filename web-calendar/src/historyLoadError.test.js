import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
// BACKLOG 74.3 (срез 4): ошибка загрузки «Истории» — LoadError с «Повторить»; повтор настоящего composable сбрасывает старую ошибку.
const h = vi.hoisted(() => ({ fail: true }));
vi.mock('./lib/supabase', () => ({
    sb: {
        auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
        from: (table) => {
            const chain = {
                select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, range: () => chain, not: () => chain, neq: () => chain, is: () => chain, in: () => chain, gte: () => chain, lte: () => chain,
                maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : null, error: null }),
                then: (res, rej) => Promise.resolve(h.fail && table === 'metrics' ? { data: null, error: { message: 'Failed to fetch' } } : { data: [], error: null }).then(res, rej),
            };
            return chain;
        },
    },
}));
import { useAuthAndData } from './lib/useHistoryData';
import HistoryView from './components/HistoryView.vue';
beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('site_lang', 'ru');
    h.fail = true;
});
describe('useAuthAndData: reload', () => {
    it('после сбоя — error и пустой ctx; после повтора — данные есть, error сброшен', async () => {
        const d = useAuthAndData();
        for (let i = 0; i < 12; i++)
            await flushPromises();
        expect(d.error.value).toBeTruthy();
        expect(d.ctx.value).toBeNull();
        h.fail = false;
        await d.reload();
        expect(d.error.value).toBeNull();
        expect(d.ctx.value).not.toBeNull();
    });
});
describe('HistoryView: ошибка загрузки', () => {
    it('сообщение с «Повторить» (role=alert); повтор вызывает reload и убирает ошибку', async () => {
        h.fail = true;
        const w = mount(HistoryView, { props: { show: { summary: true, progress: true, weekcol: true, stats: true, chart: true, weeks: true }, mode: 'history' } });
        for (let i = 0; i < 12; i++)
            await flushPromises();
        const box = w.find('[data-testid="load-error"]');
        expect(box.exists()).toBe(true);
        expect(box.attributes('role')).toBe('alert');
        h.fail = false;
        await w.find('[data-testid="load-retry"]').trigger('click');
        for (let i = 0; i < 12; i++)
            await flushPromises();
        expect(w.find('[data-testid="load-error"]').exists()).toBe(false);
        w.unmount();
    });
});
describe('HistoryView: пустая история (современное пустое состояние)', () => {
    it('данных нет — карточка с подсказкой и ссылкой на дашборд; при ошибке загрузки карточки нет', async () => {
        h.fail = false;
        const w = mount(HistoryView, { props: { show: { summary: true, progress: true, weekcol: true, stats: true, chart: true, weeks: true }, mode: 'history' } });
        for (let i = 0; i < 12; i++)
            await flushPromises();
        const box = w.find('[data-test="hist-empty"]');
        expect(box.exists()).toBe(true);
        expect(box.text()).toContain('За этот период данных пока нет.');
        expect(w.find('[data-test="hist-empty-link"]').attributes('href')).toBe('/dashboard/');
        w.unmount();
        h.fail = true;
        const w2 = mount(HistoryView, { props: { show: { summary: true, progress: true, weekcol: true, stats: true, chart: true, weeks: true }, mode: 'history' } });
        for (let i = 0; i < 12; i++)
            await flushPromises();
        expect(w2.find('[data-test="hist-empty"]').exists()).toBe(false);
        w2.unmount();
    });
});
