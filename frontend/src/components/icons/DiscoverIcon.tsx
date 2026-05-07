import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export default function DiscoverIcon({ size = 23, color = '#FFFFFF' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Path
        d="M17.0189 16.9971L21.25 21.25M17.0189 16.9971C18.6829 15.3275 19.7115 13.0242 19.7115 10.4808C19.7115 5.38277 15.5789 1.25 10.4808 1.25C5.38262 1.25 1.25 5.38277 1.25 10.4808C1.25 15.5789 5.38262 19.7115 10.4808 19.7115C13.0352 19.7115 15.3475 18.674 17.0189 16.9971Z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
