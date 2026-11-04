import type { CSSProperties } from "react";
import type { TowerId } from "./engine";
export type IconName =
  | "bolt"
  | "seed"
  | "heart"
  | "play"
  | "pause"
  | "help"
  | "trophy"
  | "restart"
  | "sound"
  | "mute"
  | "moon"
  | "sun"
  | "crate"
  | "arrow"
  | "close"
  | "leaf";
export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    bolt: <path d="M13 2 5 13h6l-1 9 9-12h-6l1-8z" />,
    seed: (
      <>
        <path d="M19 3C9 2 3 8 4 15c1 5 6 7 10 4 5-4 6-10 5-16Z" />
        <path d="m6 18 9-10" />
      </>
    ),
    heart: (
      <path d="M20 5c-3-3-7-1-8 2-2-3-6-5-9-2-3 4 1 9 9 15 8-6 11-11 8-15Z" />
    ),
    play: <path d="m8 4 13 8-13 8V4Z" />,
    pause: (
      <>
        <path d="M7 4v16M17 4v16" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 1 1 5 2c-2 1-2 1-2 3m0 3h.01" />
      </>
    ),
    trophy: (
      <>
        <path d="M7 3h10v7a5 5 0 0 1-10 0V3Zm5 12v6m-5 0h10M7 5H3v3c0 4 4 4 4 4m10-7h4v3c0 4-4 4-4 4" />
      </>
    ),
    restart: (
      <>
        <path d="M4 11a8 8 0 1 1 2 7M4 4v7h7" />
      </>
    ),
    sound: (
      <>
        <path d="m12 4-6 5H2v6h4l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
    mute: (
      <>
        <path d="m12 4-6 5H2v6h4l6 5V4Zm5 5 5 6m0-6-5 6" />
      </>
    ),
    moon: <path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    crate: (
      <>
        <path d="M3 4h18v17H3V4Zm0 5h18M8 4v17m8-17v17M3 21 21 9" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    leaf: (
      <>
        <path d="M20 3C8 2 2 9 5 16c7 6 16-2 15-13ZM4 21l11-12" />
      </>
    ),
  };
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function WheelIcon({
  rpm,
  idle,
  reduced = false,
}: {
  rpm: number;
  idle: boolean;
  reduced?: boolean;
}) {
  return (
    <svg
      className="wheel-icon"
      width="50"
      height="50"
      viewBox="0 0 50 50"
      aria-hidden="true"
    >
      <path d="M14 45h24M25 25v20" stroke="#8a6a44" strokeWidth="3" />
      <g
        className={
          !idle && rpm > 0 && !reduced
            ? "wheel-spokes spinning"
            : "wheel-spokes"
        }
        style={
          { "--wheel-duration": `${rpm > 0 ? 60 / rpm : 60}s` } as CSSProperties
        }
      >
        <circle
          cx="25"
          cy="23"
          r="19"
          fill="none"
          stroke="#8a6a44"
          strokeWidth="3"
        />
        <path
          d="M6 23h38M25 4v38M11 9l28 28M11 37 39 9"
          stroke="#c39a5f"
          strokeWidth="2"
        />
      </g>
      <path d="M15 29v-8h4v-4h4v4h10v3h4v8H17v-3z" fill="#d39c57" />
      <path d="M20 25h12v7H20z" fill="#fff0cf" />
      <path d="M29 23h3v3h-3z" fill="#39281f" />
      <circle cx="25" cy="23" r="2" fill="#8a6a44" />
    </svg>
  );
}
export function TowerArt({ type }: { type: TowerId }) {
  return (
    <svg
      className="tower-art"
      width="48"
      height="48"
      viewBox="0 0 48 48"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d="M6 37h36v6H6z" fill="#a77e4d" />
      <path d="M10 43h28v3H10z" fill="#765936" />
      {type === "spark" && (
        <>
          <path d="M17 13h14v24H17z" fill="#597c6d" />
          <path d="M12 14h24v4H12zm0 8h24v4H12zm0 8h24v4H12z" fill="#d7a454" />
          <path d="M19 6h10v7H19z" fill="#f0c770" />
          <path d="m26 0-8 8h6l-2 6 9-9h-7z" fill="#8a5e2a" />
        </>
      )}
      {type === "lamp" && (
        <>
          <path d="M21 7h6v31h-6z" fill="#6b5739" />
          <path d="M11 9h26v21H11z" fill="#e1ad51" />
          <path d="M15 13h18v12H15z" fill="#fff0ae" />
          <path d="M8 5h32v5H8zm4 24h24v5H12z" fill="#687b55" />
        </>
      )}
      {type === "fence" && (
        <>
          <path d="M9 10h7v28H9zm23 0h7v28h-7z" fill="#638272" />
          <path d="M6 6h13v6H6zm23 0h13v6H29z" fill="#d6af5c" />
          <path d="M15 17h18v3H15zm0 10h18v3H15z" fill="#b8893f" />
        </>
      )}
      {type === "catapult" && (
        <>
          <path
            d="M13 27h7v11h-7zm17-10h6v21h-6zM9 33h30v5H9z"
            fill="#8d6038"
          />
          <path d="m13 11 5-3 18 25-5 3z" fill="#bb8f53" />
          <path d="M8 6h17v7H8z" fill="#6b4e2e" />
          <path d="M13 2h9v6h-9z" fill="#d7b45f" />
          <path d="M11 37h8v8h-8zm20 0h8v8h-8z" fill="#62492e" />
        </>
      )}
      {type === "honey" && (
        <>
          <path d="M11 17h26v22H11z" fill="#dc9f3a" />
          <path d="M8 20h32v6H8z" fill="#f0c55e" />
          <path d="M13 10h22v8H13z" fill="#97703f" />
          <path d="M16 7h16v4H16z" fill="#c49b60" />
          <path d="M15 21h9v3h-9z" fill="#ffdf8a" />
          <path d="M33 24h7v16h-7zM6 39h36v4H6z" fill="#dba83f" />
        </>
      )}
      {type === "blower" && (
        <>
          <path d="M13 20h24v18H13z" fill="#7a8d63" />
          <path d="M29 7h8v20h-8z" fill="#a7b080" />
          <path d="M26 3h14v7H26z" fill="#6a694b" />
          <path d="M7 22h10v9H7z" fill="#9b7b4c" />
          <path d="M3 18h7v17H3z" fill="#ceb581" />
          <path d="M22 26h7v7h-7z" fill="#495f46" />
        </>
      )}
    </svg>
  );
}
