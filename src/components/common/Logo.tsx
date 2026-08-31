import React from 'react';
import { useBranding } from '../../lib/BrandingContext';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
  dark?: boolean;
  forceDefault?: boolean;
}

export function NinetyFiveStarShield({ className = '', size = 52 }: { className?: string; size?: number }) {
  // Exact interstate shield aspect ratio (width: 500, height: 510)
  return (
    <svg
      width={size}
      height={size * 1.02}
      viewBox="0 0 500 510"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none drop-shadow-xs ${className}`}
    >
      <defs>
        {/* Clip path for the top red header to match the inner shield upper curve */}
        <clipPath id="innerShieldClip">
          <path d="M 250,470 C 185,435 48,340 48,150 C 48,125 145,102 250,122 C 355,102 452,125 452,150 C 452,340 315,435 250,470 Z" />
        </clipPath>
      </defs>

      {/* 1. Outermost Dark Blue/Navy Border Contour */}
      <path
        d="M 250,500 C 180,460 30,360 30,140 C 30,110 135,85 250,108 C 365,85 470,110 470,140 C 470,360 320,460 250,500 Z"
        fill="#042a63"
      />

      {/* 2. White Border Ring */}
      <path
        d="M 250,482 C 182,445 40,350 40,145 C 40,118 140,94 250,115 C 360,94 460,118 460,145 C 460,350 318,445 250,482 Z"
        fill="#FFFFFF"
      />

      {/* 3. Main Inner Shield (Blue) */}
      <path
        d="M 250,470 C 185,435 48,340 48,150 C 48,125 145,102 250,122 C 355,102 452,125 452,150 C 452,340 315,435 250,470 Z"
        fill="#063e8a"
      />

      {/* 4. Top Red Header Band */}
      <g clipPath="url(#innerShieldClip)">
        <rect x="30" y="70" width="440" height="120" fill="#c31e24" />
        {/* Crisp White Separator Bar */}
        <rect x="30" y="184" width="440" height="7" fill="#FFFFFF" />
      </g>

      {/* 5. Header Text: "Airport Sedan Service" */}
      <text
        x="250"
        y="158"
        fill="#FFFFFF"
        fontFamily="Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="35"
        fontWeight="800"
        textAnchor="middle"
        letterSpacing="0.2"
      >
        Airport Sedan Service
      </text>

      {/* 6. "Ninety" Text (White Italic Bold Sans) */}
      <text
        x="250"
        y="244"
        fill="#FFFFFF"
        fontFamily="'Arial Black', Arial, -apple-system, sans-serif"
        fontSize="65"
        fontStyle="italic"
        fontWeight="900"
        textAnchor="middle"
        letterSpacing="-1"
      >
        Ninety
      </text>

      {/* 7. Giant Center Highway "5" */}
      <path
        d="M 205,272 L 305,272 L 305,302 L 242,302 L 236,335 C 248,326 264,321 282,321 C 314,321 338,342 338,375 C 338,409 310,432 272,432 C 242,432 220,417 210,394 L 239,380 C 244,394 256,403 271,403 C 288,403 301,392 301,376 C 301,360 288,348 269,348 C 253,348 240,356 233,366 L 205,357 Z"
        fill="#FFFFFF"
      />

      {/* 8. "Star" Text (White Italic Bold Sans) */}
      <text
        x="250"
        y="464"
        fill="#FFFFFF"
        fontFamily="'Arial Black', Arial, -apple-system, sans-serif"
        fontSize="58"
        fontStyle="italic"
        fontWeight="900"
        textAnchor="middle"
        letterSpacing="-0.5"
      >
        Star
      </text>

      {/* 9. Five Crisp 5-Pointed White Stars */}
      {/* Top Left Star */}
      <polygon
        points="102,342 108,358 126,358 111,369 117,385 102,374 87,385 93,369 78,358 96,358"
        fill="#FFFFFF"
      />
      {/* Bottom Left Star */}
      <polygon
        points="152,416 157,429 171,429 160,438 164,451 152,442 140,451 144,438 133,429 147,429"
        fill="#FFFFFF"
      />
      {/* Top Right Star */}
      <polygon
        points="398,342 404,358 422,358 407,369 413,385 398,374 383,385 389,369 374,358 392,358"
        fill="#FFFFFF"
      />
      {/* Bottom Right Star */}
      <polygon
        points="348,416 353,429 367,429 356,438 360,451 348,442 336,451 340,438 329,429 343,429"
        fill="#FFFFFF"
      />
      {/* Bottom Center Star */}
      <polygon
        points="250,474 254,485 266,485 256,493 260,504 250,496 240,504 244,493 234,485 246,485"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function CompanyLogoIcon({
  className = '',
  size = 52,
  forceDefault = false
}: {
  className?: string;
  size?: number;
  forceDefault?: boolean;
}) {
  const { logoUrl, companyName } = useBranding();

  if (logoUrl && !forceDefault) {
    return (
      <div
        style={{ width: size, height: size * 1.02 }}
        className={`shrink-0 select-none flex items-center justify-center overflow-hidden rounded-lg ${className}`}
      >
        <img
          src={logoUrl}
          alt={companyName || 'Company Logo'}
          className="w-full h-full object-contain filter drop-shadow-xs"
        />
      </div>
    );
  }

  return <NinetyFiveStarShield size={size} className={className} />;
}

export default function Logo({
  className = '',
  size = 52,
  showText = true,
  subtitle,
  dark = false,
  forceDefault = false
}: LogoProps) {
  const { companyName: brandCompanyName, tagline, logoUrl } = useBranding();
  const displayName = brandCompanyName || '95 Star Tracking';
  const displaySubtitle = subtitle !== undefined ? subtitle : (tagline || '');

  return (
    <div className={`inline-flex items-center gap-3.5 ${className}`}>
      <CompanyLogoIcon size={size} forceDefault={forceDefault} />
      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={`font-black tracking-tight leading-none ${
              size >= 50 ? 'text-xl sm:text-2xl' : size >= 40 ? 'text-lg' : 'text-base'
            } ${dark ? 'text-white' : 'text-slate-900'}`}
          >
            {displayName}
          </span>
          {displaySubtitle && (
            <span
              className={`text-xs font-bold uppercase tracking-wider mt-1 ${
                dark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {displaySubtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
