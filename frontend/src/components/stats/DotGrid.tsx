import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';

interface Props {
  /** Total width of the grid (px). */
  width: number;
  /** Total height of the grid (px). */
  height: number;
  /** Number of horizontal dotted lines. */
  rows: number;
  /** Vertical spacing between rows (px). */
  spacing: number;
  /** Y-offset of the first line (px). Defaults to 0. */
  topOffset?: number;
  /** Horizontal inset on each side (px). Defaults to 6. */
  inset?: number;
  /** Stroke color of the dots. Defaults to a low-contrast grey. */
  color?: string;
}

/**
 * Background pattern of evenly-spaced horizontal dotted lines.
 * Used behind several stats sections (Most Watched, Top Genres) to
 * mimic the engraved-paper look from the Figma design.
 */
export default function DotGrid({
  width,
  height,
  rows,
  spacing,
  topOffset = 0,
  inset = 6,
  color = '#1f1f1f',
}: Props): React.JSX.Element {
  const lines: number[] = [];
  for (let i = 0; i < rows; i++) lines.push(topOffset + i * spacing);

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {lines.map((y, i) => (
        <Line
          key={i}
          x1={inset}
          y1={y}
          x2={width - inset}
          y2={y}
          stroke={color}
          strokeWidth={2.5}
          strokeDasharray="0,17"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}
