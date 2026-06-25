import Svg, { Path } from 'react-native-svg';

interface Props {
  /** Icon height in pixels; width is derived to preserve the 7:6 aspect ratio. */
  size?: number;
  /** Fill colour. Defaults to white. */
  color?: string;
}

/**
 * The Letterboxd-style "liked" heart, traced from assets/icons/like.svg.
 * Shown beside a logged title's rating when the user has liked it.
 */
export function LikeIcon({ size = 9, color = '#fff' }: Props): React.JSX.Element {
  const width = (size * 7) / 6;
  return (
    <Svg width={width} height={size} viewBox="0 0 7 6" fill="none">
      <Path
        d="M2.13719 5.21469C1.15437 4.46064 0 3.57499 0 2.03967C0 0.344785 1.92506 -0.857195 3.5 0.772248L4.2 1.46884C4.30251 1.5709 4.46873 1.57087 4.57125 1.46877C4.67373 1.36667 4.67369 1.20116 4.57117 1.0991L3.89497 0.425978C5.37897 -0.655874 7 0.484368 7 2.03967C7 3.57499 5.84563 4.46064 4.86279 5.21469C4.76066 5.29307 4.66035 5.37003 4.5634 5.44615C4.2 5.73142 3.85 6 3.5 6C3.15 6 2.8 5.73142 2.43661 5.44615C2.33965 5.37003 2.23935 5.29307 2.13719 5.21469Z"
        fill={color}
      />
    </Svg>
  );
}
