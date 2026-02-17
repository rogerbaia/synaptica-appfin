import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
    width: 32,
    height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 24,
                    background: 'transparent', // Transparent background
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* We use an SVG inside the ImageResponse to render our gradient path */}
                {/* Next.js OG generation handles gradients much better than raw ICO/SVG in tabs */}
                <svg
                    width="32"
                    height="32"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="aureaTricolor" x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="25%" stopColor="#34d399" />
                            <stop offset="45%" stopColor="#0ea5e9" />
                            <stop offset="60%" stopColor="#3b82f6" />
                            <stop offset="80%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M 30 15 H 80 A 5 5 0 0 1 85 20 V 30 A 5 5 0 0 1 80 35 H 50 V 45 H 70 A 5 5 0 0 1 75 50 V 60 A 5 5 0 0 1 70 65 H 50 V 85 A 5 5 0 0 1 45 90 H 35 A 5 5 0 0 1 30 85 V 15 Z"
                        fill="url(#aureaTricolor)"
                    />
                </svg>
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    );
}
