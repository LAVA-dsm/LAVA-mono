import type { CSSProperties } from "react";

/* Deterministic, tasteful gradient pairs keyed off the name. */
const PALETTE: Array<[string, string]> = [
  ["#FF7A4D", "#FF5A2D"], // brand orange
  ["#3FB6A8", "#1E9488"], // teal
  ["#6D8BFF", "#4F63E0"], // indigo
  ["#52C07A", "#2E9E59"], // green
  ["#F0B254", "#D98A2B"], // amber
  ["#B57BFF", "#8C4FE0"], // violet
  ["#FF6F91", "#E54B6E"], // rose
  ["#4FB0E8", "#2E86C7"]  // sky
];

function pick(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // Korean: first 2 chars; Latin: first letters of up to 2 words
  if (/[가-힣]/.test(trimmed)) return trimmed.slice(0, 2);
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

const sizeMap = {
  xs: { box: 20, font: 9, radius: 6 },
  sm: { box: 26, font: 10.5, radius: 7 },
  md: { box: 32, font: 12, radius: 9 },
  lg: { box: 40, font: 14, radius: 11 }
} as const;

type AvatarSize = keyof typeof sizeMap;

export function Avatar({
  name,
  size = "md",
  ring = false,
  className = ""
}: {
  name: string;
  size?: AvatarSize;
  ring?: boolean;
  className?: string;
}) {
  const [c1, c2] = pick(name);
  const s = sizeMap[size];
  const style: CSSProperties & Record<string, string> = {
    width: `${s.box}px`,
    height: `${s.box}px`,
    fontSize: `${s.font}px`,
    borderRadius: `${s.radius}px`,
    ["--av-1"]: c1,
    ["--av-2"]: c2
  };
  return (
    <span
      className={["lava-avatar", ring ? "ring-2 ring-lava-surface" : "", className].join(" ")}
      style={style}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* Overlapping avatar stack for member lists. */
export function AvatarStack({
  names,
  max = 3,
  size = "sm"
}: {
  names: string[];
  max?: number;
  size?: AvatarSize;
}) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  const s = sizeMap[size];
  return (
    <div className="flex items-center">
      {shown.map((name, i) => (
        <span key={`${name}-${i}`} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: max - i }}>
          <Avatar name={name} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="lava-avatar ring-2 ring-lava-surface"
          style={{
            marginLeft: -8,
            width: `${s.box}px`,
            height: `${s.box}px`,
            fontSize: `${s.font}px`,
            borderRadius: `${s.radius}px`,
            background: "#E4E6EA",
            color: "#5C616B"
          }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
