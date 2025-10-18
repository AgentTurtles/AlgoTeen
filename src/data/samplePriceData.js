const SAMPLE_PRICE_DATA = (() => {
  const start = new Date('2024-01-02');
  const bars = [];
  let close = 102.4;

  for (let index = 0; index < 160; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    const seasonal = Math.sin(index / 7) * 2.4 + Math.cos(index / 11) * 1.6;
    const momentumBoost = index % 23 === 0 ? 3.2 : 0;
    const pullback = index % 37 === 0 ? -2.8 : 0;
    const drift = seasonal * 0.7 + momentumBoost + pullback * 0.6;

    close = Math.max(68, close + drift * 0.45);
    const open = close - drift * 0.25;
    const high = close + Math.abs(drift) * 0.6 + 1.4;
    const low = close - Math.abs(drift) * 0.6 - 1.2;
    const volume = Math.round(1200 + (index % 12) * 75 + Math.abs(drift) * 90);

    bars.push({
      date: date.toISOString().slice(0, 10),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
  }

  return bars;
})();

export default SAMPLE_PRICE_DATA;
