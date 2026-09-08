import { useMemo } from 'react';

type ScenePanelProps = {
  time: number;
  angle: number;
  optimalAngle: number;
  irradiance: number;
  mode: string;
  running: boolean;
};

function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = Math.floor(minutes % 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function ScenePanel({ time, angle, optimalAngle, irradiance, mode, running }: ScenePanelProps) {
  const sun = useMemo(() => {
    const progress = Math.max(0, Math.min(1, (time - 360) / 720));
    const altitude = Math.sin(progress * Math.PI);
    return {
      x: 150 + progress * 630,
      y: 245 - altitude * 162,
      intensity: Math.round(irradiance * altitude),
    };
  }, [time, irradiance]);

  const rayTargets = [405, 440, 475, 510];
  return (
    <section className="panel scene-panel" data-testid="panel-live-scene">
      <div className="panel-head">
        <div>
          <div className="panel-title">Live instrument view</div>
          <div className="panel-subtitle">Azimuth / elevation assembly · local frame</div>
        </div>
        <div className="eyebrow mono">SIM // 04A</div>
      </div>
      <div className="scene-stage">
        <svg viewBox="0 0 900 430" role="img" aria-label="Animated solar tracker scene showing sun rays, panel, support and motor">
          <defs>
            <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#183456" stopOpacity=".75" />
              <stop offset="1" stopColor="#0b1729" stopOpacity=".12" />
            </linearGradient>
            <linearGradient id="panelCells" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1f7086" />
              <stop offset=".5" stopColor="#123958" />
              <stop offset="1" stopColor="#102844" />
            </linearGradient>
            <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f8c86e" stopOpacity=".06" />
              <stop offset=".5" stopColor="#f8c86e" stopOpacity=".68" />
              <stop offset="1" stopColor="#f8c86e" stopOpacity=".05" />
            </linearGradient>
            <radialGradient id="sunGlow">
              <stop offset="0" stopColor="#ffe5a6" stopOpacity=".95" />
              <stop offset=".28" stopColor="#ffc861" stopOpacity=".72" />
              <stop offset="1" stopColor="#f2a94f" stopOpacity="0" />
            </radialGradient>
            <filter id="softGlow"><feGaussianBlur stdDeviation="12" /></filter>
          </defs>
          <rect width="900" height="430" fill="url(#skyFade)" />
          <g opacity=".24" stroke="#88abc0" strokeWidth="1">
            <path d="M50 330 H850" />
            <path d="M120 365 H790" />
            <path d="M200 398 H710" />
          </g>
          <g opacity=".13" fill="none" stroke="#73a1b9" strokeWidth="1">
            <ellipse cx="475" cy="365" rx="370" ry="70" />
            <ellipse cx="475" cy="365" rx="270" ry="47" />
          </g>
          <g>
            <circle cx={sun.x} cy={sun.y} r="55" fill="url(#sunGlow)" filter="url(#softGlow)" />
            <circle cx={sun.x} cy={sun.y} r="24" fill="#ffd47a" />
            <circle cx={sun.x} cy={sun.y} r="17" fill="#ffeab0" opacity=".85" />
            <text x={sun.x - 25} y={sun.y + 48} fill="#d3b77a" fontSize="10" fontFamily="DM Mono">SUN / {sun.intensity} Wm²</text>
          </g>
          <g stroke="url(#beam)" strokeWidth="1.5">
            {rayTargets.map((target, index) => (
              <line key={target} x1={sun.x + 4} y1={sun.y + 5} x2={target} y2={258 + index * 3} opacity={.78 - index * .08} />
            ))}
          </g>
          <g transform={`translate(460 272) rotate(${angle})`} style={{ transition: running ? 'transform .65s cubic-bezier(.2,.8,.2,1)' : 'none' }}>
            <rect x="-137" y="-9" width="274" height="18" rx="3" fill="#172c43" stroke="#5ad7dc" strokeWidth="1" />
            <rect x="-126" y="-77" width="252" height="132" rx="4" fill="url(#panelCells)" stroke="#68dae0" strokeWidth="2" />
            <g stroke="#5db8c5" strokeWidth=".65" opacity=".72">
              {[-105, -63, -21, 21, 63, 105].map(x => <line key={`v-${x}`} x1={x} y1="-77" x2={x} y2="55" />)}
              {[-55, -22, 11, 44].map(y => <line key={`h-${y}`} x1="-126" y1={y} x2="126" y2={y} />)}
            </g>
            <path d="M-126-77 L126-77" stroke="#b0ffff" strokeWidth="2.5" opacity=".7" />
            <text x="-108" y="-87" fill="#8fdee0" fontSize="9" fontFamily="DM Mono">PV ARRAY / 01</text>
            <circle cx="0" cy="0" r="7" fill="#e0ae60" stroke="#ffe0a0" />
            <path d="M0 6v52" stroke="#e8b967" strokeWidth="4" />
          </g>
          <g>
            <path d="M460 276 L460 354" stroke="#b5c7d0" strokeWidth="9" opacity=".8" />
            <path d="M460 286 L414 354 M460 286 L512 354" stroke="#708a9c" strokeWidth="5" />
            <path d="M424 354 H497" stroke="#acc1ca" strokeWidth="8" />
            <rect x="435" y="355" width="50" height="17" rx="3" fill="#263c4e" stroke="#6b98a5" />
            <circle cx="460" cy="365" r="7" fill="#e0a95e" stroke="#f6cc87" />
            <path d="M448 365 H472" stroke="#101b2b" strokeWidth="2" />
            <text x="518" y="359" fill="#83a7b6" fontSize="10" fontFamily="DM Mono">AZ MOTOR</text>
            <text x="518" y="374" fill="#506d7f" fontSize="9" fontFamily="DM Mono">TORQUE 0.42 Nm</text>
          </g>
          <g fontFamily="DM Mono" fontSize="10">
            <text x="54" y="67" fill="#6f94aa">SOLAR VECTOR</text>
            <text x="54" y="84" fill="#c2d5dd">{Math.round(sun.x / 9)}° AZ / {Math.round(62 - Math.abs(optimalAngle))}° EL</text>
            <text x="735" y="67" fill="#6f94aa">PANEL NORMAL</text>
            <text x="735" y="84" fill="#c2d5dd">{angle.toFixed(1)}°</text>
          </g>
        </svg>
        <div className="scene-footer">
          <div className="scene-legend">
            <span className="legend-item"><i className="legend-line" /> incident rays</span>
            <span className="legend-item"><i className="legend-line cyan" /> panel normal</span>
          </div>
          <div className="scene-status" data-testid="status-scene">
            {running ? 'LIVE · tracking enabled' : 'PAUSED · manual inspection'}
          </div>
        </div>
      </div>
    </section>
  );
}

export { formatTime };