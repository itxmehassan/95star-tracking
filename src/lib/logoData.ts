// Generates high-res PNG / Canvas representation of the company logo for PDF documents

let cachedLogoDataUrl: string | null = null;
let lastUsedCustomLogo: string | null = null;

export interface BrandInfo {
  companyName: string;
  tagline: string;
  logoDataUrl?: string;
}

export function getBrandInfo(): { companyName: string; tagline: string; logoUrl: string | null } {
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('company_branding_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          companyName: parsed.companyName || '95 Star Tracking',
          tagline: parsed.tagline || 'Airport Sedan Service',
          logoUrl: parsed.logoUrl || null
        };
      }
    }
  } catch {}
  return {
    companyName: '95 Star Tracking',
    tagline: 'Airport Sedan Service',
    logoUrl: null
  };
}

export function getLogoDataUrl(): Promise<string> {
  const brand = getBrandInfo();

  // If custom logo is present in branding
  if (brand.logoUrl) {
    if (cachedLogoDataUrl && lastUsedCustomLogo === brand.logoUrl) {
      return Promise.resolve(cachedLogoDataUrl);
    }

    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 400;
          canvas.height = img.height || 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            cachedLogoDataUrl = dataUrl;
            lastUsedCustomLogo = brand.logoUrl;
            resolve(dataUrl);
          } else {
            resolve(brand.logoUrl!);
          }
        };
        img.onerror = () => {
          // If image load fails, return raw string or fallback
          resolve(brand.logoUrl!);
        };
        img.src = brand.logoUrl;
      } catch {
        resolve(brand.logoUrl);
      }
    });
  }

  // Otherwise generate high-res SVG rendering of default Ninety 5 Star Shield
  if (cachedLogoDataUrl && lastUsedCustomLogo === null) {
    return Promise.resolve(cachedLogoDataUrl);
  }

  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined') {
        resolve('');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 510;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve('');
        return;
      }

      const svgString = `
      <svg width="500" height="510" viewBox="0 0 500 510" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="innerShieldClip">
            <path d="M 250,470 C 185,435 48,340 48,150 C 48,125 145,102 250,122 C 355,102 452,125 452,150 C 452,340 315,435 250,470 Z" />
          </clipPath>
        </defs>
        <!-- Outermost Border -->
        <path d="M 250,500 C 180,460 30,360 30,140 C 30,110 135,85 250,108 C 365,85 470,110 470,140 C 470,360 320,460 250,500 Z" fill="#042a63" />
        <!-- White Ring -->
        <path d="M 250,482 C 182,445 40,350 40,145 C 40,118 140,94 250,115 C 360,94 460,118 460,145 C 460,350 318,445 250,482 Z" fill="#FFFFFF" />
        <!-- Inner Shield Blue -->
        <path d="M 250,470 C 185,435 48,340 48,150 C 48,125 145,102 250,122 C 355,102 452,125 452,150 C 452,340 315,435 250,470 Z" fill="#063e8a" />
        <!-- Top Red Header -->
        <g clip-path="url(#innerShieldClip)">
          <rect x="30" y="70" width="440" height="120" fill="#c31e24" />
          <rect x="30" y="184" width="440" height="7" fill="#FFFFFF" />
        </g>
        <!-- Airport Sedan Service -->
        <text x="250" y="158" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="35" font-weight="bold" text-anchor="middle">Airport Sedan Service</text>
        <!-- Ninety -->
        <text x="250" y="244" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="65" font-style="italic" font-weight="900" text-anchor="middle">Ninety</text>
        <!-- 5 -->
        <path d="M 205,272 L 305,272 L 305,302 L 242,302 L 236,335 C 248,326 264,321 282,321 C 314,321 338,342 338,375 C 338,409 310,432 272,432 C 242,432 220,417 210,394 L 239,380 C 244,394 256,403 271,403 C 288,403 301,392 301,376 C 301,360 288,348 269,348 C 253,348 240,356 233,366 L 205,357 Z" fill="#FFFFFF" />
        <!-- Star -->
        <text x="250" y="464" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="58" font-style="italic" font-weight="900" text-anchor="middle">Star</text>
        <!-- Stars -->
        <polygon points="102,342 108,358 126,358 111,369 117,385 102,374 87,385 93,369 78,358 96,358" fill="#FFFFFF" />
        <polygon points="152,416 157,429 171,429 160,438 164,451 152,442 140,451 144,438 133,429 147,429" fill="#FFFFFF" />
        <polygon points="398,342 404,358 422,358 407,369 413,385 398,374 383,385 389,369 374,358 392,358" fill="#FFFFFF" />
        <polygon points="348,416 353,429 367,429 356,438 360,451 348,442 336,451 340,438 329,429 343,429" fill="#FFFFFF" />
        <polygon points="250,474 254,485 266,485 256,493 260,504 250,496 240,504 244,493 234,485 246,485" fill="#FFFFFF" />
      </svg>
      `;

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        cachedLogoDataUrl = canvas.toDataURL('image/png');
        lastUsedCustomLogo = null;
        resolve(cachedLogoDataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.src = url;
    } catch {
      resolve('');
    }
  });
}
