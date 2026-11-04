import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEF,
  SLOTS,
  TOWERS,
  buildCost,
  chooseUpgrade,
  levelTower,
  newGame,
  phaseOf,
  placeTower,
  receiveBlocks,
  sellTower,
  sellValue,
  startWave,
  tick,
  towerRange,
  upgradeCost,
  type Game,
  type TowerId,
} from "./engine";
import { practiceWheel, type Wheel } from "./feed";
import { render, W, H } from "./art";
import { Icon, TowerArt, WheelIcon } from "./Icons";
import { useWheel } from "./useWheel";
import {
  hasSeenTutorial,
  markTutorialSeen,
  readScores,
  saveScore,
  type Score,
} from "./storage";

type Panel = "tutorial" | "scores" | "restart" | "result" | null;
const formatBlock = (b: string | null) =>
  b === null ? "—" : BigInt(b).toLocaleString("en-US");
function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current?.();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        {onClose && (
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      {children}
    </dialog>
  );
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function App() {
  const gameRef = useRef<Game>(newGame());
  const [, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  const [selectedType, setSelectedType] = useState<TowerId | null>("catapult");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel>(() =>
    hasSeenTutorial() ? null : "tutorial",
  );
  const [scores, setScores] = useState<Score[]>(readScores);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [sound, setSound] = useState(false);
  const [blockToast, setBlockToast] = useState<string | null>(null);
  const soundRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionRef = useRef({ selectedType, selectedSlot });
  selectionRef.current = { selectedType, selectedSlot };
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const onBlocks = useCallback(
    (from: string, to: string) => {
      if (["lost", "won"].includes(gameRef.current.phase)) return;
      receiveBlocks(gameRef.current, from, to);
      setBlockToast(
        `Block Crate arrived · real Squeek block #${formatBlock(to)}`,
      );
      refresh();
    },
    [refresh],
  );
  useEffect(() => {
    if (blockToast) {
      const timer = setTimeout(() => setBlockToast(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [blockToast]);
  const { feed, feedRef, retry } = useWheel(onBlocks);
  const g = gameRef.current;
  const wheel = feed.online ? feed.wheel : practiceWheel(g.elapsed);
  const wheelRef = useRef<Wheel>(wheel);
  wheelRef.current = wheel;
  const phase = phaseOf(wheel);
  const tower = g.towers.find((t) => t.slot === selectedSlot);
  const ended = g.phase === "lost" || g.phase === "won";
  const disabledPlay = ended || !!panel || g.crates.length > 0;
  const beep = useCallback((frequency = 330, duration = 0.055) => {
    if (!soundRef.current) return;
    try {
      const ctx = audioRef.current ?? (audioRef.current = new AudioContext());
      if (ctx.state === "suspended") void ctx.resume();
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      /* Sound is optional; the game continues if audio is unavailable. */
    }
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current!,
      ctx = canvas.getContext("2d")!;
    let frame = 0,
      last = performance.now(),
      lastUI = 0,
      angle = 0,
      lastDraw = 0,
      oldPhase = gameRef.current.phase,
      lastKills = 0;
    const animate = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      const game = gameRef.current,
        currentFeed = feedRef.current;
      const currentWheel = currentFeed.online
        ? currentFeed.wheel
        : practiceWheel(game.elapsed);
      wheelRef.current = currentWheel;
      if (panelRef.current === null && !document.hidden)
        tick(
          game,
          delta,
          currentWheel,
          currentFeed.online ? currentFeed.blockHeight : null,
        );
      angle =
        (angle +
          (currentWheel.status === "ACTIVE"
            ? ((currentWheel.rpm * Math.PI * 2) / 60) * delta
            : 0)) %
        (Math.PI * 2);
      if (game.kills < lastKills) lastKills = game.kills;
      if (game.kills > lastKills) {
        beep(440 + (game.kills % 4) * 60);
        lastKills = game.kills;
      }
      if (now - lastDraw >= 1000 / 30) {
        render(
          ctx,
          game,
          currentWheel,
          angle,
          selectionRef.current.selectedSlot,
          selectionRef.current.selectedType,
          reduced ||
            game.paused ||
            panelRef.current !== null ||
            game.crates.length > 0,
        );
        lastDraw = now;
      }
      if (game.phase !== oldPhase) {
        oldPhase = game.phase;
        if (oldPhase === "lost" || oldPhase === "won") {
          setPanel("result");
          setSaved(false);
          setStorageError("");
        }
        refresh();
      }
      if (now - lastUI >= 100) {
        refresh();
        lastUI = now;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [beep, feedRef, reduced, refresh]);
  const act = useCallback(
    (fn: () => void) => {
      fn();
      refresh();
    },
    [refresh],
  );
  const selectTower = useCallback(
    (id: TowerId) => {
      if (
        !gameRef.current.unlocked.includes(id) ||
        ["lost", "won"].includes(gameRef.current.phase)
      )
        return;
      setSelectedType(id);
      setSelectedSlot(null);
      gameRef.current.message = `${DEF[id].name} selected. Choose a marked plot.`;
      beep(280);
      refresh();
    },
    [beep, refresh],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.repeat ||
        (e.target instanceof HTMLElement &&
          /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
      )
        return;
      if (panelRef.current || gameRef.current.crates.length) return;
      const def = TOWERS.find((t) => t.key === e.key);
      if (def) {
        e.preventDefault();
        selectTower(def.id);
      }
      if (e.code === "Space" && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        gameRef.current.paused = !gameRef.current.paused;
        refresh();
      }
      if (e.key === "Escape") {
        setSelectedSlot(null);
        setSelectedType(null);
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [refresh, selectTower]);
  const onPlot = (slot: number) => {
    if (disabledPlay) return;
    const existing = g.towers.find((t) => t.slot === slot);
    if (existing) {
      setSelectedSlot(slot);
      setSelectedType(null);
    } else if (selectedType) {
      if (placeTower(g, selectedType, slot, wheelRef.current)) beep(380);
      setSelectedSlot(slot);
    } else {
      setSelectedSlot(slot);
      g.message = "Choose a tower from the build tools, then choose this plot.";
    }
    refresh();
  };
  const restart = () => {
    const endless = g.endless;
    gameRef.current = newGame();
    gameRef.current.endless = endless;
    setSelectedType("catapult");
    setSelectedSlot(null);
    setPanel(null);
    setSaved(false);
    setStorageError("");
    refresh();
  };
  const finishTutorial = () => {
    markTutorialSeen();
    setPanel(null);
  };
  const recordScore = (e: React.FormEvent) => {
    e.preventDefault();
    const success = saveScore({
      name: playerName,
      wave: g.wave,
      block: g.endBlock,
      kills: g.kills,
      practice: g.usedPractice,
      endless: g.endless,
      won: g.phase === "won",
      date: new Date().toISOString(),
    });
    if (success) {
      setSaved(true);
      setScores(readScores());
      setStorageError("");
    } else
      setStorageError(
        "This browser blocked local storage. Allow site storage to save your score.",
      );
  };
  const toggleSound = () => {
    const value = !sound;
    soundRef.current = value;
    setSound(value);
    if (value) beep(400, 0.1);
  };
  const waveAction = () => {
    if (startWave(g)) {
      setSelectedSlot(null);
      beep(550, 0.15);
    }
    refresh();
  };

  return (
    <>
      <a href="#game" className="skip-link">
        Skip to game
      </a>
      {blockToast && (
        <div className="block-toast" role="status">
          <Icon name="crate" size={18} />
          <span>{blockToast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss block notification"
            onClick={() => setBlockToast(null)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      <div className="site-shell">
        <header className="site-header">
          <div className="brand">
            <img src="./favicon.svg" width="44" height="44" alt="" />
            <div>
              <h1>
                Burrow Siege<span className="title-dot">.</span>
              </h1>
              <p>A hamster-powered tower defense</p>
            </div>
          </div>
          <nav className="header-tools" aria-label="Game information">
            <button
              className="text-button scores-button"
              aria-label="High scores"
              onClick={() => {
                setScores(readScores());
                setPanel("scores");
              }}
            >
              <Icon name="trophy" />
              <span>High scores</span>
            </button>
            <button
              className="icon-button help-button"
              onClick={() => setPanel("tutorial")}
              aria-label="How to play"
            >
              <Icon name="help" />
            </button>
          </nav>
        </header>

        <main id="game">
          <section
            className="wheel-feed"
            aria-label="Live wheel and Squeek block"
          >
            <div className="wheel-reading">
              <WheelIcon
                rpm={wheel.rpm}
                idle={wheel.status !== "ACTIVE"}
                reduced={reduced || g.paused || !!panel || g.crates.length > 0}
              />
              <div>
                <div
                  className={`status-pill ${!feed.online ? "offline" : phase === "nap" ? "nap" : "active"}`}
                  role="status"
                  aria-live="polite"
                >
                  <i />
                  {feed.loading
                    ? "Connecting…"
                    : feed.online
                      ? phase === "nap"
                        ? "Live · Napping"
                        : "Live · Running"
                      : "Wheel feed offline"}
                </div>
                <p className="rpm-value">
                  {wheel.rpm.toFixed(1)} <span>RPM</span>
                </p>
                {!feed.online && (
                  <span className="simulation-label">
                    Practice mode · simulated
                  </span>
                )}
              </div>
            </div>
            <div className="feed-context">
              <strong>
                {feed.online ? "Powered by Squeektoshi" : "Practice mode"}
              </strong>
              <span>
                {feed.online
                  ? `${wheel.status === "ACTIVE" ? `${(wheel.rpm * 2).toFixed(1)} W/s generated` : "A well-earned rest"} · updates every 5s`
                  : feed.loading
                    ? "Starting with a simulated wheel"
                    : "Simulated wheel · auto-reconnects"}
              </span>
            </div>
            <div className="block-reading">
              <div>
                <Icon name="crate" size={16} />
                <span>{feed.online ? "Squeek block" : "Last real block"}</span>
                <strong>#{formatBlock(feed.blockHeight)}</strong>
              </div>
              <div
                className="block-progress"
                role="progressbar"
                aria-label="Squeek block progress"
                aria-valuenow={Math.round((feed.blockProgress ?? 0) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  style={{ width: `${(feed.blockProgress ?? 0) * 100}%` }}
                />
              </div>
              <span className="block-percent">
                {feed.blockProgress === null
                  ? "Awaiting block data"
                  : `${(feed.blockProgress * 100).toFixed(1)}% to next block`}
              </span>
            </div>
            {!feed.online && !feed.loading && (
              <button
                className="retry-button"
                onClick={retry}
                aria-label="Retry live wheel feed"
              >
                <Icon name="restart" size={16} />
                <span>Retry</span>
              </button>
            )}
          </section>

          <div className="game-layout">
            <section className="play-area" aria-label="Burrow battlefield">
              <div className="hud">
                <div className="battery-stat">
                  <div className="stat-label">
                    <Icon name="bolt" size={16} />
                    <span>Battery</span>
                    <strong>
                      {Math.floor(g.battery)}
                      <span> / {g.batteryCap} W</span>
                    </strong>
                  </div>
                  <div
                    className={`battery-track ${g.battery < 20 ? "low" : ""}`}
                    role="progressbar"
                    aria-label="Battery Watts"
                    aria-valuenow={Math.floor(g.battery)}
                    aria-valuemin={0}
                    aria-valuemax={g.batteryCap}
                  >
                    <span
                      style={{ width: `${(g.battery / g.batteryCap) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="resource-stat seed-stat">
                  <Icon name="seed" />
                  <strong>{g.seeds}</strong>
                  <span>Seeds</span>
                </div>
                <div className="resource-stat heart-stat">
                  <Icon name="heart" />
                  <strong>
                    {g.hearts}
                    <span>/20</span>
                  </strong>
                  <span>Vault</span>
                </div>
                <div className="resource-stat wave-stat">
                  <span>Wave</span>
                  <strong>
                    {g.wave}
                    <span>/{g.endless ? "∞" : "20"}</span>
                  </strong>
                </div>
              </div>
              <div className="scene-toolbar">
                <span className="burrow-name">
                  <Icon name="leaf" size={16} />
                  Sunflower Hollow
                </span>
                <select
                  className="quick-build"
                  aria-label="Quick tower selection"
                  value={selectedType ?? ""}
                  disabled={ended}
                  onChange={(e) => selectTower(e.target.value as TowerId)}
                >
                  <option value="" disabled>
                    Select a tower
                  </option>
                  {(["Electric", "Mechanical"] as const).map((family) => (
                    <optgroup key={family} label={family}>
                      {TOWERS.filter((t) => t.family === family).map((t) => (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={!g.unlocked.includes(t.id)}
                        >
                          {t.name}
                          {g.unlocked.includes(t.id)
                            ? ""
                            : ` · wave ${t.unlock}`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {["ready", "between"].includes(g.phase) && (
                  <button
                    className="button primary toolbar-launch"
                    onClick={waveAction}
                    disabled={g.paused || !!g.crates.length}
                  >
                    <Icon name="play" size={14} />
                    {g.wave === 0 ? "Start wave 1" : `Send wave ${g.wave + 1}`}
                  </button>
                )}
                <div className="play-controls">
                  <button
                    className="icon-button"
                    aria-label={sound ? "Mute sound" : "Enable sound"}
                    aria-pressed={sound}
                    onClick={toggleSound}
                  >
                    <Icon name={sound ? "sound" : "mute"} size={18} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={g.paused ? "Resume game" : "Pause game"}
                    aria-pressed={g.paused}
                    disabled={ended}
                    onClick={() =>
                      act(() => {
                        g.paused = !g.paused;
                      })
                    }
                  >
                    <Icon name={g.paused ? "play" : "pause"} size={18} />
                  </button>
                  <button
                    className="speed-button"
                    aria-label={`Game speed ${g.speed}x. Switch to ${g.speed === 1 ? 2 : 1}x`}
                    disabled={ended}
                    onClick={() =>
                      act(() => {
                        g.speed = g.speed === 1 ? 2 : 1;
                      })
                    }
                  >
                    {g.speed}×
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Restart run"
                    onClick={() => setPanel("restart")}
                  >
                    <Icon name="restart" size={18} />
                  </button>
                </div>
              </div>
              <div className="battlefield">
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  aria-label="Side-on pixel-art burrow. Predators follow three winding tunnels to the seed vault. Use the marked plot buttons to build towers."
                  role="img"
                />
                <div
                  className="plots"
                  role="group"
                  aria-label="Tower build plots"
                >
                  {SLOTS.map(([x, y], i) => {
                    const t = g.towers.find((t) => t.slot === i);
                    return (
                      <button
                        key={i}
                        className={`plot ${t ? "occupied" : ""} ${selectedSlot === i ? "selected" : ""}`}
                        style={{
                          left: `${(x / W) * 100}%`,
                          top: `${(y / H) * 100}%`,
                        }}
                        aria-label={
                          t
                            ? `Plot ${i + 1}: ${DEF[t.type].name}, level ${t.level}. Select tower`
                            : `Plot ${i + 1}: build ${selectedType ? DEF[selectedType].name : "a tower"}`
                        }
                        disabled={disabledPlay}
                        onClick={() => onPlot(i)}
                      >
                        <span>{t ? "" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
                {g.paused && (
                  <div className="pause-overlay">
                    <Icon name="pause" size={24} />
                    <strong>Burrow paused</strong>
                    <button
                      className="button primary"
                      onClick={() =>
                        act(() => {
                          g.paused = false;
                        })
                      }
                    >
                      Resume game
                    </button>
                  </div>
                )}
                {ended && (
                  <div className="end-overlay">
                    <strong>
                      {g.phase === "won"
                        ? "The seeds are safe!"
                        : "The vault needs a new plan."}
                    </strong>
                    <button
                      className="button primary"
                      onClick={() => setPanel("result")}
                    >
                      View run result
                    </button>
                  </div>
                )}
                {!g.towers.length && !g.paused && !ended && (
                  <div className="scene-hint">
                    <span>Build on the + plots</span>
                    <Icon name="arrow" size={16} />
                  </div>
                )}
              </div>
              <div className={`phase-banner ${phase}`}>
                <Icon
                  name={
                    phase === "nap" ? "moon" : phase === "rush" ? "bolt" : "sun"
                  }
                  size={20}
                />
                <div>
                  <strong>
                    {phase === "nap"
                      ? feed.online
                        ? "Squeektoshi is napping, build now"
                        : "Practice wheel resting, build now"
                      : phase === "rush"
                        ? feed.online
                          ? "Overcharge! The burrow is buzzing"
                          : "Practice overcharge is active"
                        : feed.online
                          ? "Little paws. Plenty of power."
                          : "Practice wheel is powering the burrow"}
                  </strong>
                  <span>
                    {!feed.online && "Practice · "}
                    {phase === "nap"
                      ? "Predators 0.5× speed · building 30% off"
                      : phase === "rush"
                        ? "Waves 1.3× speed · electric damage +50%"
                        : "Electric towers are charging. Keep a mechanical backup."}
                  </span>
                </div>
              </div>
              <div className="wave-controls">
                <div className="wave-info">
                  <strong>
                    {g.phase === "ready"
                      ? "Make yourself at burrow."
                      : g.phase === "between"
                        ? `Wave ${g.wave} cleared`
                        : g.phase === "running"
                          ? `${g.spawnLeft + g.enemies.length} predators left`
                          : g.phase === "won"
                            ? "Twenty waves. One safe vault."
                            : `Reached wave ${g.wave}`}
                  </strong>
                  <span>
                    {g.phase === "ready"
                      ? "Build a few towers before the first wave."
                      : g.phase === "between"
                        ? "Spend your seeds, then send the next wave."
                        : g.phase === "running"
                          ? `${g.kills} defeated · ${g.towers.length} towers defending`
                          : "Save this run in your local high scores."}
                  </span>
                </div>
                {["ready", "between"].includes(g.phase) ? (
                  <button
                    className="button primary launch-button"
                    onClick={waveAction}
                    disabled={g.paused || !!g.crates.length}
                  >
                    <Icon name="play" size={18} />
                    {g.wave === 0 ? "Start wave 1" : `Send wave ${g.wave + 1}`}
                  </button>
                ) : (
                  <button
                    className={`button ${ended ? "primary" : "quiet"}`}
                    onClick={() =>
                      ended
                        ? setPanel("result")
                        : act(() => {
                            g.paused = !g.paused;
                          })
                    }
                  >
                    <Icon
                      name={ended ? "trophy" : g.paused ? "play" : "pause"}
                      size={18}
                    />
                    {ended ? "Run result" : g.paused ? "Resume" : "Pause wave"}
                  </button>
                )}
              </div>
              <div className="game-message" role="status" aria-live="polite">
                {g.message}
              </div>
            </section>

            <aside className="build-panel" aria-labelledby="build-title">
              <div className="build-heading">
                <h2 id="build-title">Build your defense</h2>
                <p>
                  Choose a tower, then a <b>+</b> plot.
                </p>
              </div>
              {(["Electric", "Mechanical"] as const).map((family) => (
                <section
                  className="tower-family"
                  key={family}
                  aria-label={`${family} towers`}
                >
                  <div className="family-heading">
                    <h3>
                      <Icon
                        name={family === "Electric" ? "bolt" : "seed"}
                        size={16}
                      />
                      {family}
                    </h3>
                    <span>
                      {family === "Electric" ? "Uses Watts" : "Always works"}
                    </span>
                  </div>
                  <div className="tower-list">
                    {TOWERS.filter((t) => t.family === family).map((def) => {
                      const locked = !g.unlocked.includes(def.id),
                        cost = buildCost(def.id, wheel);
                      return (
                        <button
                          key={def.id}
                          className={`tower-button ${selectedType === def.id ? "chosen" : ""} ${locked ? "locked" : ""}`}
                          disabled={locked || ended}
                          aria-pressed={selectedType === def.id}
                          onClick={() => selectTower(def.id)}
                          aria-label={`${def.name}, ${locked ? `unlocks wave ${def.unlock}` : `${cost} seeds, ${def.watts ? `${def.watts} Watts per shot` : "no power needed"}`}`}
                        >
                          <TowerArt type={def.id} />
                          <span className="tower-copy">
                            <strong>{def.name}</strong>
                            <span>
                              {locked ? (
                                `Unlocks wave ${def.unlock}`
                              ) : (
                                <>
                                  <Icon name="seed" size={12} />
                                  {cost}
                                  <span className="tower-power">
                                    {def.watts
                                      ? `${def.watts} W / shot`
                                      : "Free to fire"}
                                  </span>
                                </>
                              )}
                            </span>
                          </span>
                          <kbd>{def.key}</kbd>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
              <div className="tower-details" aria-live="polite">
                {tower ? (
                  <>
                    <div className="detail-title">
                      <strong>{DEF[tower.type].name}</strong>
                      <span>Level {tower.level}/3</span>
                    </div>
                    <p>{DEF[tower.type].description}</p>
                    <div className="tower-numbers">
                      <span>
                        {Math.round(
                          DEF[tower.type].damage *
                            Math.pow(1.45, tower.level - 1) *
                            (DEF[tower.type].watts && phase === "rush"
                              ? 1.5
                              : 1),
                        )}{" "}
                        damage
                      </span>
                      <span>{Math.round(towerRange(g, tower))} range</span>
                    </div>
                    <div className="tower-actions">
                      <button
                        className="button small"
                        disabled={
                          tower.level >= 3 ||
                          g.seeds < upgradeCost(tower, wheel) ||
                          ended
                        }
                        onClick={() =>
                          act(() => {
                            levelTower(g, tower.id, wheelRef.current);
                          })
                        }
                      >
                        {tower.level >= 3
                          ? "Max level"
                          : `Upgrade · ${upgradeCost(tower, wheel)} seeds`}
                      </button>
                      <button
                        className="sell-button"
                        disabled={ended}
                        onClick={() =>
                          act(() => {
                            sellTower(g, tower.id);
                            setSelectedSlot(null);
                          })
                        }
                      >
                        Sell · {sellValue(tower)}
                      </button>
                    </div>
                  </>
                ) : selectedType ? (
                  <>
                    <div className="detail-title">
                      <strong>{DEF[selectedType].name}</strong>
                      <span>{DEF[selectedType].family}</span>
                    </div>
                    <p>{DEF[selectedType].description}</p>
                    <div className="tower-numbers">
                      <span>{DEF[selectedType].damage} damage</span>
                      <span>{DEF[selectedType].range} range</span>
                      <span>
                        {DEF[selectedType].watts
                          ? `${DEF[selectedType].watts} W/shot`
                          : "No Watts"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p>
                    Select a tower in the burrow to upgrade it to level 3 or
                    sell it for a 70% refund.
                  </p>
                )}
              </div>
              <div className="run-mode">
                <label htmlFor="run-mode">Run mode</label>
                <select
                  id="run-mode"
                  value={g.endless ? "endless" : "classic"}
                  disabled={g.phase !== "ready"}
                  onChange={(e) =>
                    act(() => {
                      g.endless = e.target.value === "endless";
                    })
                  }
                >
                  <option value="classic">20 waves</option>
                  <option value="endless">Endless</option>
                </select>
              </div>
            </aside>
          </div>

          <div className="under-game">
            <p>
              <span className="desktop-hint">
                <kbd>1</kbd>–<kbd>6</kbd> select tower <i /> <kbd>Space</kbd>{" "}
                pause <i />{" "}
              </span>
              Build. Balance. Keep the seeds safe.
            </p>
            <button
              className="text-button"
              onClick={() => setPanel("tutorial")}
            >
              Field guide <Icon name="arrow" size={16} />
            </button>
          </div>
          <details className="feed-details">
            <summary>About the live wheel</summary>
            <div>
              <p>
                {feed.online
                  ? "Live hardware measurements power this run."
                  : feed.reason}{" "}
                A practice run uses a simulated 28 / 48 / 0 RPM cycle and is
                marked in local scores. Real block numbers are never simulated.
              </p>
              <dl>
                <div>
                  <dt>Freshness</dt>
                  <dd>{feed.freshness}</dd>
                </div>
                <div>
                  <dt>Wheel distance</dt>
                  <dd>
                    {feed.distanceMm === null
                      ? "Unavailable"
                      : `${(feed.distanceMm / 1000).toFixed(2)} m${feed.online ? "" : " (last real reading)"}`}
                  </dd>
                </div>
                <div>
                  <dt>Power rule</dt>
                  <dd>Active RPM × 2 Watts per second</dd>
                </div>
              </dl>
              <a
                href="https://api.squeekchain.com/v1/status"
                target="_blank"
                rel="noreferrer"
              >
                View the public status API <Icon name="arrow" size={14} />
              </a>
            </div>
          </details>
        </main>
        <footer>
          <span>Made for small paws & big plans.</span>
          <p>
            Unofficial fan game for Squeekchain. Data read live from the public
            API on Sepolia testnet.
          </p>
          <span className="genesis-label">
            <Icon name="leaf" size={14} />
            Genesis Code
          </span>
        </footer>
      </div>

      {panel === "tutorial" && (
        <Modal
          title="A keeper’s field guide"
          onClose={finishTutorial}
          className="tutorial-modal"
        >
          <p className="tutorial-intro">Defend the seed vault for 20 waves.</p>
          <ol className="tutorial-steps">
            <li>
              <Icon name="bolt" />
              <div>
                <strong>Wheel power</strong>
                <p>Wheel power fuels electric towers. Mechanical fires free.</p>
              </div>
            </li>
            <li>
              <Icon name="moon" />
              <div>
                <strong>Nap time</strong>
                <p>Slower predators. Building costs 30% less.</p>
              </div>
            </li>
            <li>
              <Icon name="crate" />
              <div>
                <strong>Block Crates</strong>
                <p>New real block? Pick an upgrade.</p>
              </div>
            </li>
          </ol>
          <p className="tutorial-tip">Start with a mechanical tower.</p>
          <button
            className="button primary full-width"
            autoFocus
            onClick={finishTutorial}
          >
            Enter the burrow <Icon name="arrow" size={18} />
          </button>
        </Modal>
      )}
      {panel === "scores" && (
        <Modal title="Local high scores" onClose={() => setPanel(null)}>
          <p className="modal-description">
            The best ten runs saved in this browser.
          </p>
          {!scores.length ? (
            <div className="empty-scores">
              <Icon name="trophy" size={36} />
              <h3>A quiet hall of fame</h3>
              <p>
                Finish a run and save your name to put the first score here.
              </p>
              <button className="button primary" onClick={() => setPanel(null)}>
                Return to the burrow
              </button>
            </div>
          ) : (
            <ol className="scores-list">
              {scores.map((s, i) => (
                <li key={`${s.date}-${i}`}>
                  <span className="score-rank">{i + 1}</span>
                  <div>
                    <strong>{s.name}</strong>
                    <span>
                      {s.practice ? "Practice" : "Live wheel"} ·{" "}
                      {s.endless ? "Endless" : "20 waves"} · {s.kills} defeated
                    </span>
                  </div>
                  <div className="score-result">
                    <strong>
                      Wave {s.wave}
                      {s.won ? " ✓" : ""}
                    </strong>
                    <span>
                      {s.block
                        ? `Block #${formatBlock(s.block)}`
                        : "No live end block"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Modal>
      )}
      {panel === "restart" && (
        <Modal title="Restart this run?" onClose={() => setPanel(null)}>
          <p className="modal-description">
            Your current towers, seeds, and wave progress will be reset. Saved
            high scores stay here.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setPanel(null)}>
              Keep playing
            </button>
            <button className="button primary" onClick={restart}>
              Restart run
            </button>
          </div>
        </Modal>
      )}
      {panel === "result" && (
        <Modal
          title={
            g.phase === "won" ? "The seeds are safe!" : "A brave little defense"
          }
          onClose={() => setPanel(null)}
        >
          <div className="result-art">
            <Icon name={g.phase === "won" ? "trophy" : "seed"} size={36} />
          </div>
          <p className="result-line">
            {g.phase === "won"
              ? "You held the burrow through all 20 waves."
              : `The vault fell on wave ${g.wave}. Every burrow keeper starts somewhere.`}
          </p>
          <div className="result-stats">
            <div>
              <strong>{g.wave}</strong>
              <span>Wave reached</span>
            </div>
            <div>
              <strong>{g.kills}</strong>
              <span>Predators stopped</span>
            </div>
            <div>
              <strong>
                {g.endBlock ? `#${formatBlock(g.endBlock)}` : "Unavailable"}
              </strong>
              <span>Real block at finish</span>
            </div>
          </div>
          <p className="practice-note">
            {g.usedPractice
              ? "Practice run · simulated wheel used"
              : "Live wheel run"}{" "}
            · {g.endless ? "Endless mode" : "20-wave mode"}
          </p>
          <form onSubmit={recordScore} className="score-form">
            <label htmlFor="player-name">
              Name for local high scores <span>(max 20 characters)</span>
            </label>
            <div>
              <input
                id="player-name"
                name="playerName"
                autoComplete="nickname"
                type="text"
                maxLength={20}
                value={playerName}
                placeholder="Burrow keeper"
                disabled={saved}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <button className="button" type="submit" disabled={saved}>
                {saved ? "Score saved" : "Save score"}
              </button>
            </div>
            {storageError && (
              <p className="form-error" role="alert">
                {storageError}
              </p>
            )}
          </form>
          <div className="modal-actions">
            <button className="button primary" onClick={restart}>
              Defend again <Icon name="restart" size={16} />
            </button>
            {g.phase === "won" && (
              <button
                className="button"
                onClick={() =>
                  act(() => {
                    g.endless = true;
                    g.phase = "between";
                    g.endBlock = null;
                    setPanel(null);
                    setSaved(false);
                  })
                }
              >
                Continue endless
              </button>
            )}
          </div>
        </Modal>
      )}
      {g.crates.length > 0 && panel === null && (
        <Modal
          title={
            g.crates[0].block
              ? "A Block Crate has arrived"
              : "A Practice Crate has arrived"
          }
          className="crate-modal"
        >
          <div className="crate-hero">
            <Icon name="crate" size={40} />
            <strong>
              {g.crates[0].block
                ? `Real Squeek block #${formatBlock(g.crates[0].block)}`
                : "Simulated reward · no real block"}
            </strong>
            <p>Choose one upgrade. The burrow waits while you decide.</p>
          </div>
          <div className="upgrade-choices">
            {g.crates[0].choices.map((u, i) => (
              <button
                key={u.id}
                onClick={() =>
                  act(() => {
                    chooseUpgrade(g, i);
                    beep(650, 0.15);
                  })
                }
              >
                <Icon
                  name={
                    u.id === "battery"
                      ? "bolt"
                      : u.id === "unlock"
                        ? "crate"
                        : u.id === "rate"
                          ? "sun"
                          : "arrow"
                  }
                  size={24}
                />
                <strong>{u.name}</strong>
                <span>{u.description}</span>
                <span className="choose-label">
                  Choose upgrade <Icon name="arrow" size={14} />
                </span>
              </button>
            ))}
          </div>
          {g.crates.length > 1 && (
            <p className="privacy-note">
              {g.crates.length - 1} more crates waiting.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
