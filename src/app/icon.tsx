import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** Generated monogram favicon — replace with a real logo file once the owner supplies one (see README). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2B2620',
          color: '#B4852D',
          fontSize: 20,
          fontWeight: 700,
          fontFamily: 'serif',
        }}
      >
        GC
      </div>
    ),
    { ...size },
  );
}
