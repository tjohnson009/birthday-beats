import { ReactElement } from "react";

// same drawing as src/app/icon.svg, inlined so the header doesn't wait on a second request
export default function LogoMark({ className }: { className?: string }): ReactElement {
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
            <defs>
                <linearGradient id="logo-mark-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#2F6BFF" />
                    <stop offset="1" stopColor="#16C79A" />
                </linearGradient>
            </defs>
            <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#logo-mark-gradient)" />
            <rect x="6.6" y="19" width="4.6" height="7.4" rx="1.3" fill="#fff" fillOpacity=".6" />
            <rect x="13.7" y="14.6" width="4.6" height="11.8" rx="1.3" fill="#fff" fillOpacity=".8" />
            <rect x="20.8" y="11" width="4.6" height="15.4" rx="1.3" fill="#fff" />
            <path
                d="M20.4 9.2V5.4L21.9 6.9L23.1 4.4L24.3 6.9L25.8 5.4V9.2Z"
                fill="#fff"
                stroke="#fff"
                strokeWidth=".6"
                strokeLinejoin="round"
            />
        </svg>
    );
}
