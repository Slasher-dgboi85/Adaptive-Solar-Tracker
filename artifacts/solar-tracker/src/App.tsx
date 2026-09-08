import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Clock3, Crosshair, FlaskConical, Gauge, Pause, Play, RotateCcw, SlidersHorizontal, SunMedium, Zap } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ScenePanel, formatTime } from '@/components/solar/ScenePanel';
import { EnergyChart } from '@/components/solar/EnergyChart';
import '@/index.css';

const queryClient = new QueryClient();

type Mode = 'Fixed' | 'Time' | 'LDR' | 'Dual Axis' | 'Adaptive';
type ChartMetric = 'solar' | 'cumulative' | 'net' | 'angle';
type Settings = {
  motorPower: number;
  speed: number;
  interval: number;
  deadband: number;
  efficiency: number;
  area: number;
  maxIrradiance: number;
};
type Point = { minute: number; solar: number; motor: number; net: number; angle: number; cumulative: number };
type RunResult = {
  solarEnergy: number;
  motorEnergy: number;
  netEnergy: number;
  movements: number;
  averageError: number;
  solarPower: number;
  points: Point[];
};

const DEFAULT_SETTINGS: Settings = {
  motorPower: 5,
  speed: 6,
  interval: 15,
  deadband: 2,
  efficiency: 19,
  area: 1.6,
  maxIrradiance: 980,
};
const MODES: Mode[] = ['Fixed', 'Time', 'LDR', 'Dual Axis', 'Adaptive'];
const MODE_COPY: Record<Mode, string> = {
  Fixed: 'Panel stays at a reference angle. The clean baseline: no motor draw, but large morning and evening losses.',
  Time: 'A clock moves the panel at a fixed interval using the expected solar position.',
  LDR: 'A low-cost light sensor follows the brightest direction with a small measurement bias.',
  'Dual Axis': 'Two-axis control removes both azimuth and elevation error. Highest capture, highest activity.',
  Adaptive: 'Motion only happens when the predicted energy gain clears the motor cost and deadband.',
};

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

function solarOptimalAngle(minute: number) {
  const progress = clamp((minute - 360) / 720, 0, 1);
  return 58 * Math.sin(progress * Math.PI);
}

function irradianceAt(minute: number, settings: Settings) {
  const progress = clamp((minute - 360) / 720, 0, 1);
  return settings.maxIrradiance * Math.pow(Math.sin(progress * Math.PI), .64);
}

function panelPower(minute: number, angle: number, settings: Settings) {
  const irradiance = irradianceAt(minute, settings);
  const error = Math.abs(angle - solarOptimalAngle(minute));
  const cosine = Math.max(0, Math.cos((error * Math.PI) / 180));
  return irradiance * settings.area * (settings.efficiency / 100) * Math.pow(cosine, 1.35);
}

function targetFor(mode: Mode, minute: number) {
  const optimal = solarOptimalAngle(minute);
  if (mode === 'Fixed') return 0;
  if (mode === 'LDR') return clamp(optimal + 4.5 * Math.sin(minute / 23), -58, 58);
  return optimal;
}

function calculateRun(mode: Mode, settings: Settings, endMinute = 1080): RunResult {
  let angle = 0;
  let lastMove = 360;
  let solarEnergy = 0;
  let motorEnergy = 0;
  let errorTotal = 0;
  let movements = 0;
  const points: Point[] = [];
  for (let minute = 360; minute <= Math.max(360, endMinute); minute += 5) {
    const target = targetFor(mode, minute);
    const due = mode !== 'Fixed' && (minute === 360 || minute - lastMove >= settings.interval);
    if (due) {
      const difference = Math.abs(target - angle);
      const expectedGain = Math.max(0, panelPower(minute, target, settings) - panelPower(minute, angle, settings)) * settings.interval / 60;
      const moveCost = settings.motorPower * (.028 + difference * .0011);
      const shouldMove = mode !== 'Adaptive' || (difference > settings.deadband && expectedGain > moveCost);
      if (shouldMove && difference > .15) {
        motorEnergy += moveCost;
        angle = target;
        lastMove = minute;
        movements += 1;
      } else if (mode !== 'Adaptive') {
        lastMove = minute;
      }
    }
    const power = panelPower(minute, angle, settings);
    solarEnergy += power * (5 / 60);
    errorTotal += Math.abs(angle - solarOptimalAngle(minute));
    points.push({
      minute,
      solar: power,
      motor: motorEnergy,
      cumulative: solarEnergy,
      net: solarEnergy - motorEnergy,
      angle,
    });
  }
  const last = points[points.length - 1];
  return {
    solarEnergy,
    motorEnergy,
    netEnergy: solarEnergy - motorEnergy,
    movements,
    averageError: errorTotal / points.length,
    solarPower: last?.solar ?? 0,
    points,
  };
}

function value(value: number, digits = 1) {
  return value.toFixed(digits);
}

function App() {
  const [mode, setMode] = useState<Mode>('Adaptive');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [minute, setMinute] = useState(540);
  const [panelAngle, setPanelAngle] = useState(0);
  const [running, setRunning] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('solar');
  const [experimentRan, setExperimentRan] = useState(false);
  const lastMoveRef = useRef(360);

  const currentRun = useMemo(() => calculateRun(mode, settings, minute), [mode, settings, minute]);
  const comparison = useMemo(() => {
    const fixed = calculateRun('Fixed', settings);
    return MODES.map(currentMode => {
      const result = currentMode === 'Fixed' ? fixed : calculateRun(currentMode, settings);
      return {
        mode: currentMode,
        ...result,
        gain: fixed.netEnergy === 0 ? 0 : ((result.netEnergy - fixed.netEnergy) / fixed.netEnergy) * 100,
      };
    });
  }, [settings]);
  const bestInterval = useMemo(() => {
    const options = [5, 10, 15, 20, 30, 45, 60];
    return options.map(interval => {
      const result = calculateRun('Adaptive', { ...settings, interval });
      return { interval, net: result.netEnergy };
    }).sort((a, b) => b.net - a.net)[0];
  }, [settings]);
  const activeComparison = comparison.find(item => item.mode === mode) ?? comparison[0];
  const history = useMemo(() => {
    const generated = currentRun.points.slice(-58);
    if (generated.length) generated[generated.length - 1] = { ...generated[generated.length - 1], angle: panelAngle };
    return generated;
  }, [currentRun.points, panelAngle]);
  const optimalAngle = solarOptimalAngle(minute);
  const angleDifference = Math.abs(optimalAngle - panelAngle);
  const expectedGain = Math.max(0, panelPower(minute, optimalAngle, settings) - panelPower(minute, panelAngle, settings)) * settings.interval / 60;
  const motorCost = settings.motorPower * (.028 + angleDifference * .0011);
  const decisionMove = mode === 'Adaptive' && angleDifference > settings.deadband && expectedGain > motorCost;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setMinute(previous => {
        const next = Math.min(1080, previous + Math.max(1, settings.speed));
        if (next >= 1080) setRunning(false);
        return next;
      });
      setPanelAngle(previous => {
        const nextMinute = Math.min(1080, minute + Math.max(1, settings.speed));
        const target = targetFor(mode, nextMinute);
        const due = mode !== 'Fixed' && nextMinute - lastMoveRef.current >= settings.interval;
        if (!due) return previous;
        const difference = Math.abs(target - previous);
        const predicted = Math.max(0, panelPower(nextMinute, target, settings) - panelPower(nextMinute, previous, settings)) * settings.interval / 60;
        const cost = settings.motorPower * (.028 + difference * .0011);
        const shouldMove = mode !== 'Adaptive' || (difference > settings.deadband && predicted > cost);
        if (shouldMove) {
          lastMoveRef.current = nextMinute;
          return target;
        }
        if (mode !== 'Adaptive') lastMoveRef.current = nextMinute;
        return previous;
      });
    }, 820);
    return () => window.clearInterval(timer);
  }, [running, settings, mode, minute]);

  function updateSetting<K extends keyof Settings>(key: K, next: number) {
    setSettings(previous => ({ ...previous, [key]: next }));
  }

  function resetSimulation() {
    setRunning(false);
    setMinute(540);
    setPanelAngle(0);
    lastMoveRef.current = 360;
    setSettings(DEFAULT_SETTINGS);
    setMode('Adaptive');
    setExperimentRan(false);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <main className="dashboard-shell">
          <header className="topbar">
            <div className="brand">
              <div className="brand-mark" aria-hidden="true"><span /></div>
              <div>
                <div className="eyebrow">Engineering lab / 01</div>
                <div className="brand-name">SOLAR TRACKER</div>
              </div>
            </div>
            <nav className="topbar-nav" aria-label="Primary navigation">
              <span className="nav-active">Simulator</span>
              <span>Energy model</span>
              <span>About the rig</span>
            </nav>
            <div className="system-state"><span className="state-dot" /> LOCAL SIMULATION</div>
          </header>

          <div className="page-wrap">
            <section className="intro">
              <div>
                <div className="eyebrow">Energy-aware adaptive control</div>
                <h1>Follow the sun.<br /><span style={{ color: 'hsl(var(--primary))' }}>Spend less to do it.</span></h1>
                <p>A compact solar tracker you can interrogate. Tune the rig, watch the assembly move, then compare whether each correction earns back its motor cost.</p>
              </div>
              <div className="intro-readout">
                <div className="eyebrow">simulated local time</div>
                <div className="intro-time mono" data-testid="text-time">{formatTime(minute)}</div>
                <div className="intro-meta">{Math.round(irradianceAt(minute, settings))} W/m² incident · {mode} control</div>
              </div>
            </section>

            <div className="layout-grid">
              <ScenePanel time={minute} angle={panelAngle} optimalAngle={optimalAngle} irradiance={irradianceAt(minute, settings)} mode={mode} running={running} />
              <section className="panel control-panel" data-testid="panel-controls">
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Control surface</div>
                    <div className="panel-subtitle">Change one variable. Observe the tradeoff.</div>
                  </div>
                  <SlidersHorizontal size={15} color="hsl(var(--muted-foreground))" />
                </div>
                <div className="control-body">
                  <div className="eyebrow">Tracking algorithm</div>
                  <div className="mode-grid">
                    {MODES.map(item => (
                      <button className={`mode-btn ${mode === item ? 'selected' : ''}`} key={item} onClick={() => { setMode(item); setPanelAngle(0); lastMoveRef.current = 360; }} data-testid={`button-mode-${item.toLowerCase().replace(' ', '-')}`} aria-pressed={mode === item}>{item}</button>
                    ))}
                  </div>
                  <div className="mode-detail" data-testid="text-mode-description">{MODE_COPY[mode]}</div>

                  <div className="control-row">
                    <label className="control-label" htmlFor="motor-power"><span>Motor power</span><span className="control-value">{settings.motorPower} W</span></label>
                    <input id="motor-power" data-testid="input-motor-power" type="range" min="1" max="20" step="1" value={settings.motorPower} onChange={event => updateSetting('motorPower', Number(event.target.value))} />
                    <div className="range-scale"><span>1 W</span><span>20 W</span></div>
                  </div>
                  <div className="control-row">
                    <label className="control-label" htmlFor="sim-speed"><span>Simulation speed</span><span className="control-value">{settings.speed}×</span></label>
                    <input id="sim-speed" data-testid="input-sim-speed" type="range" min="1" max="20" step="1" value={settings.speed} onChange={event => updateSetting('speed', Number(event.target.value))} />
                    <div className="range-scale"><span>1×</span><span>20×</span></div>
                  </div>
                  <div className="control-row">
                    <label className="control-label" htmlFor="tracking-interval"><span>Tracking interval</span><span className="control-value">{settings.interval} min</span></label>
                    <input id="tracking-interval" data-testid="input-tracking-interval" type="range" min="1" max="60" step="1" value={settings.interval} onChange={event => updateSetting('interval', Number(event.target.value))} />
                    <div className="range-scale"><span>1 min</span><span>60 min</span></div>
                  </div>
                  <div className="control-row">
                    <label className="control-label" htmlFor="deadband"><span>Deadband</span><span className="control-value">{settings.deadband}°</span></label>
                    <input id="deadband" data-testid="input-deadband" type="range" min="0" max="10" step="0.5" value={settings.deadband} onChange={event => updateSetting('deadband', Number(event.target.value))} />
                    <div className="range-scale"><span>0°</span><span>10°</span></div>
                  </div>
                  <div className="control-divider" />
                  <div className="control-row">
                    <label className="control-label" htmlFor="efficiency"><span>Panel efficiency</span><span className="control-value">{settings.efficiency}%</span></label>
                    <input id="efficiency" data-testid="input-efficiency" type="range" min="10" max="28" step="1" value={settings.efficiency} onChange={event => updateSetting('efficiency', Number(event.target.value))} />
                    <div className="range-scale"><span>10%</span><span>28%</span></div>
                  </div>
                  <div className="control-row">
                    <label className="control-label" htmlFor="panel-area"><span>Panel area</span><span className="control-value">{value(settings.area, 1)} m²</span></label>
                    <input id="panel-area" data-testid="input-panel-area" type="range" min="0.5" max="4" step="0.1" value={settings.area} onChange={event => updateSetting('area', Number(event.target.value))} />
                    <div className="range-scale"><span>.5 m²</span><span>4 m²</span></div>
                  </div>
                  <div className="control-row">
                    <label className="control-label" htmlFor="irradiance"><span>Max irradiance</span><span className="control-value">{settings.maxIrradiance} W/m²</span></label>
                    <input id="irradiance" data-testid="input-irradiance" type="range" min="500" max="1200" step="10" value={settings.maxIrradiance} onChange={event => updateSetting('maxIrradiance', Number(event.target.value))} />
                    <div className="range-scale"><span>500</span><span>1200 W/m²</span></div>
                  </div>
                  <div className="action-row">
                    <button className="button-primary" onClick={() => setRunning(previous => !previous)} data-testid="button-toggle-simulation">
                      {running ? <Pause size={13} /> : <Play size={13} />} {running ? 'Pause simulation' : 'Start simulation'}
                    </button>
                    <button className="button-reset" onClick={resetSimulation} data-testid="button-reset"><RotateCcw size={12} /> Reset</button>
                  </div>
                </div>
              </section>
            </div>

            <section className="metric-strip" aria-label="Energy metrics">
              <div className="metric-card solar" data-testid="metric-solar"><div className="metric-label"><SunMedium size={12} /> Solar energy</div><div className="metric-number">{value(currentRun.solarEnergy)}</div><div className="metric-unit">Wh captured today</div></div>
              <div className="metric-card motor" data-testid="metric-motor"><div className="metric-label"><Gauge size={12} /> Motor energy</div><div className="metric-number">{value(currentRun.motorEnergy, 2)}</div><div className="metric-unit">Wh consumed · {currentRun.movements} moves</div></div>
              <div className="metric-card net" data-testid="metric-net"><div className="metric-label"><Zap size={12} /> Net energy</div><div className="metric-number">{value(currentRun.netEnergy)}</div><div className="metric-unit">Wh available after tracking</div></div>
              <div className="metric-card signal" data-testid="metric-signal"><div className="metric-label"><Activity size={12} /> Capture signal</div><div className="metric-number">{value(currentRun.solarPower)}</div><div className="metric-unit">W current panel output</div></div>
            </section>

            <div className="lower-grid">
              <section className="panel chart-panel">
                <div className="panel-head">
                  <div><div className="panel-title">Energy traces</div><div className="panel-subtitle">Current run · 06:00 to 18:00</div></div>
                  <div className="eyebrow mono">{history.length} samples</div>
                </div>
                <div className="chart-tabs" role="tablist" aria-label="Chart selection">
                  {([['solar', 'Solar power'], ['cumulative', 'Cumulative'], ['net', 'Net energy'], ['angle', 'Panel angle']] as [ChartMetric, string][]).map(([metric, label]) => (
                    <button key={metric} className={`chart-tab ${chartMetric === metric ? 'active' : ''}`} onClick={() => setChartMetric(metric)} data-testid={`button-chart-${metric}`} role="tab" aria-selected={chartMetric === metric}>{label}</button>
                  ))}
                </div>
                <EnergyChart data={history} metric={chartMetric} />
              </section>

              <section className="panel compare-panel" data-testid="panel-comparison">
                <div className="panel-head">
                  <div><div className="panel-title">Algorithm comparison</div><div className="panel-subtitle">Full-day run · click a mode to inspect</div></div>
                  <Crosshair size={15} color="hsl(var(--accent))" />
                </div>
                <div className="compare-summary">Adaptive control is the live mode. The bars show net energy relative to the best result in this run, not raw panel output.</div>
                <div className="compare-list">
                  {comparison.map(item => {
                    const width = Math.max(5, (item.netEnergy / Math.max(...comparison.map(row => row.netEnergy))) * 100);
                    return (
                      <button className="compare-row" key={item.mode} onClick={() => { setMode(item.mode); setPanelAngle(0); lastMoveRef.current = 360; }} data-testid={`row-comparison-${item.mode.toLowerCase().replace(' ', '-')}`} style={{ width: '100%', textAlign: 'left', color: 'inherit', background: item.mode === mode ? 'rgba(62, 212, 216, .06)' : 'transparent' }}>
                        <span className="compare-name">{item.mode}</span>
                        <span className="bar-track"><span className="bar-fill" style={{ width: `${width}%` }} /></span>
                        <span className="compare-gain">{item.gain >= 0 ? '+' : ''}{value(item.gain)}%</span>
                      </button>
                    );
                  })}
                </div>
                <div className="compare-summary" style={{ borderLeftColor: 'hsl(var(--primary))' }} data-testid="text-comparison-detail">
                  <span className="mono">{activeComparison.mode}</span> · {value(activeComparison.solarEnergy)} Wh solar · {value(activeComparison.motorEnergy, 2)} Wh motor · {value(activeComparison.netEnergy)} Wh net · {activeComparison.movements} movements · {value(activeComparison.averageError)}° average error
                </div>
              </section>
            </div>

            <section className="panel decision-panel" data-testid="panel-adaptive-decision">
              <div className="decision-copy">
                <div className={`decision-badge ${decisionMove ? '' : 'stay'}`}>{decisionMove ? 'MOVE' : 'STAY'}</div>
                <div className="eyebrow">Adaptive decision engine</div>
                <h3>{decisionMove ? 'The gain clears the cost.' : 'Hold position.'}</h3>
                <p>The controller estimates the energy recovered by correcting the panel, then subtracts the motor pulse. It moves only when the result is worth the mechanical wear and draw.</p>
                <div className="decision-facts">
                  <div className="decision-fact"><label>Current angle</label><strong>{value(panelAngle)}°</strong></div>
                  <div className="decision-fact"><label>Optimal angle</label><strong className="teal">{value(optimalAngle)}°</strong></div>
                  <div className="decision-fact"><label>Difference</label><strong>{value(angleDifference)}°</strong></div>
                  <div className="decision-fact"><label>Expected gain</label><strong className="amber">{value(expectedGain, 2)} Wh</strong></div>
                </div>
              </div>
              <div className="decision-visual">
                <div className="eyebrow" style={{ marginBottom: 22 }}>Move economics / next interval</div>
                <div className="decision-meter-label"><span>Expected solar gain</span><span className="mono">{value(expectedGain, 2)} Wh</span></div>
                <div className="decision-meter"><span style={{ width: `${clamp(expectedGain / Math.max(motorCost * 3, .01) * 100, 4, 100)}%` }} /></div>
                <div style={{ height: 25 }} />
                <div className="decision-meter-label"><span>Motor cost</span><span className="mono">{value(motorCost, 2)} Wh</span></div>
                <div className="decision-meter"><span style={{ width: `${clamp(motorCost / Math.max(expectedGain * 1.5, .01) * 100, 4, 100)}%`, background: '#e6ad62' }} /></div>
                <div className="angle-scale"><span>low return</span><span>economic threshold</span><span>high return</span></div>
              </div>
            </section>

            <section className="panel experiment" data-testid="panel-interval-experiment">
              <div className="experiment-copy">
                <h3><FlaskConical size={14} /> Interval experiment</h3>
                <p>Run seven deterministic full-day sweeps. Find the interval that leaves the most energy after motor cost.</p>
              </div>
              <div className="experiment-result">
                {experimentRan ? <><div><strong>{bestInterval.interval} min</strong><span>best interval</span></div><div><strong>{value(bestInterval.net)} Wh</strong><span>projected net</span></div></> : <div><strong>Ready</strong><span>local experiment</span></div>}
                <button className="button-quiet" onClick={() => setExperimentRan(true)} data-testid="button-run-experiment"><Clock3 size={13} /> {experimentRan ? 'Re-run sweep' : 'Run sweep'}</button>
              </div>
            </section>

            <footer className="footer-note"><span>DETERMINISTIC LOCAL MODEL / NO DATA LEAVES THIS DEVICE</span><span className="mono">ARRAY-01 · {settings.area.toFixed(1)} m² · η {settings.efficiency}%</span></footer>
          </div>
        </main>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;