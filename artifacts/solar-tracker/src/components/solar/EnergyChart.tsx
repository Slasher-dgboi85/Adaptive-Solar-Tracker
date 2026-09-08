type ChartPoint = { minute: number; solar: number; motor: number; net: number; angle: number; cumulative: number };

type EnergyChartProps = {
  data: ChartPoint[];
  metric: 'solar' | 'cumulative' | 'net' | 'angle';
};

function labelForMetric(metric: EnergyChartProps['metric']) {
  if (metric === 'solar') return { title: 'Solar power', unit: 'W', color: '#49d9dc' };
  if (metric === 'cumulative') return { title: 'Cumulative solar energy', unit: 'Wh', color: '#79e0b4' };
  if (metric === 'angle') return { title: 'Panel angle', unit: '°', color: '#b99be8' };
  return { title: 'Net energy', unit: 'Wh', color: '#edbb6c' };
}

export function EnergyChart({ data, metric }: EnergyChartProps) {
  const view = labelForMetric(metric);
  const width = 680;
  const height = 220;
  const pad = { left: 38, right: 12, top: 18, bottom: 27 };
  const values = data.map(point => metric === 'solar' ? point.solar : metric === 'cumulative' ? point.cumulative : metric === 'angle' ? point.angle : point.net);
  const max = Math.max(...values, 1);
  const min = metric === 'angle' ? Math.min(...values, -5) : 0;
  const range = Math.max(1, max - min);
  const x = (index: number) => pad.left + (index / Math.max(1, data.length - 1)) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + (1 - (value - min) / range) * (height - pad.top - pad.bottom);
  const line = data.map((point, index) => `${x(index).toFixed(1)},${y(values[index]).toFixed(1)}`).join(' ');
  const area = `${pad.left},${height - pad.bottom} ${line} ${x(data.length - 1)},${height - pad.bottom}`;
  const yTicks = [0, .5, 1].map(fraction => min + range * fraction);

  return (
    <div className="chart-wrap" data-testid={`chart-${metric}`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${view.title} chart`}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={view.color} stopOpacity=".22" />
            <stop offset="1" stopColor={view.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((tick, index) => (
          <g key={tick}>
            <line className="chart-grid-line" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
            <text className="chart-axis" x="3" y={y(tick) + 3}>{tick.toFixed(metric === 'angle' ? 0 : 1)}</text>
            {index === 2 && <text className="chart-axis" x={width - 30} y={y(tick) - 7}>{view.unit}</text>}
          </g>
        ))}
        {data.length > 1 && <polygon points={area} className="chart-area" fill={view.color} />}
        {data.length > 1 && <polyline points={line} className="chart-line" stroke={view.color} />}
        {data.filter((_, index) => index === data.length - 1).map((point, index) => (
          <circle key={`${point.minute}-${index}`} className="chart-point" cx={x(data.length - 1)} cy={y(values[data.length - 1])} r="4" fill={view.color} />
        ))}
        <text className="chart-axis" x={pad.left} y={height - 7}>06:00</text>
        <text className="chart-axis" x={width / 2 - 15} y={height - 7}>12:00</text>
        <text className="chart-axis" x={width - 39} y={height - 7}>18:00</text>
      </svg>
    </div>
  );
}