import type { CSSProperties } from "react";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  fill?: boolean;
  weight?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({
  name,
  size = 24,
  color,
  fill = false,
  weight = 400,
  className = "",
  style,
}: IconProps) {
  return (
    <span
      className={`msr ${className}`}
      data-fill={fill ? "1" : "0"}
      aria-hidden="true"
      style={{
        fontSize: size,
        width: size,
        height: size,
        lineHeight: 1,
        overflow: "hidden",
        flexShrink: 0,
        pointerEvents: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontVariationSettings: `"FILL" ${fill ? 1 : 0}, "wght" ${weight}, "GRAD" 0, "opsz" 24`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
