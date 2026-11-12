export const arcHue = (index) => Math.round((index * 137.5 + 205) % 360);
export function donutArcs(groups, gapFrac = 0.012) {
    const total = groups.reduce((s, g) => s + g.total, 0);
    if (total <= 0)
        return [];
    const gap = groups.length > 1 ? gapFrac : 0;
    let start = 0;
    return groups.map((g, idx) => {
        const share = g.total / total;
        const len = Math.max(0, share - gap);
        const arc = { key: g.key, hue: arcHue(idx), startFrac: start + gap / 2, lenFrac: len, doneFrac: g.total > 0 ? len * (g.done / g.total) : 0 };
        start += share;
        return arc;
    });
}
export const groupPct = (g) => (g.total > 0 ? Math.round((g.done / g.total) * 100) : 0);
