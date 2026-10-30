import { HowItWorksFlow } from '../components/landing/HowItWorksFlow'
import { ArchitectureSection } from '../components/landing/ArchitectureSection'

interface LandingProps {
  onStartApp: () => void
}

export function Landing({ onStartApp }: LandingProps) {
  return (
    <div
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      className="relative min-h-screen bg-white text-[#111317] flex flex-col justify-between selection:bg-[#DCE4FF] selection:text-[#111317] overflow-x-hidden"
    >
      <style>{`
        /* Exact 3D Glossy Periwinkle Hunch Orb */
        .hunch-orb {
          background: radial-gradient(
            circle at 42% 35%,
            #EBF0FF 0%,
            #CFD9FF 26%,
            #A8BAFF 62%,
            #8CA2FF 88%,
            #7B92FF 100%
          );
          box-shadow:
            inset -5px -6px 14px rgba(72, 95, 220, 0.24),
            inset 3px 4px 10px rgba(255, 255, 255, 0.9),
            0 8px 20px -4px rgba(123, 146, 255, 0.32);
          position: relative;
          border: 1px solid rgba(138, 160, 255, 0.45);
        }

        /* Main soft diagonal specular highlight on top-left */
        .hunch-orb::before {
          content: '';
          position: absolute;
          top: 13%;
          left: 15%;
          width: 34%;
          height: 20%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.12) 100%);
          border-radius: 999px;
          transform: rotate(-30deg);
          pointer-events: none;
        }

        /* Tiny crisp secondary specular dot */
        .hunch-orb::after {
          content: '';
          position: absolute;
          top: 17%;
          left: 44%;
          width: 6.5%;
          height: 6.5%;
          background: rgba(255, 255, 255, 0.96);
          border-radius: 999px;
          pointer-events: none;
        }

        /* Subtle calm breathing & natural blink */
        @keyframes calmFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        @keyframes calmBlink {
          0%, 46%, 49%, 100% { transform: scaleY(1); }
          47.5% { transform: scaleY(0.1); }
        }

        .orb-float {
          animation: calmFloat 5s ease-in-out infinite;
        }

        .orb-eyes {
          transform-origin: center;
          animation: calmBlink 6s ease-in-out infinite;
        }

        /* Silent Infinite Horizontal SVG Marquee (35s smooth drift + edge alpha fade) */
        .marquee-mask {
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%);
        }

        @keyframes silentMarquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }

        .marquee-track {
          display: flex;
          width: max-content;
          animation: silentMarquee 35s linear infinite;
          will-change: transform;
        }

        .marquee-mask:hover .marquee-track {
          animation-play-state: paused;
        }

        .icon-node {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: #FAFBFD;
          border: 1px solid rgba(220, 228, 255, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
        }

        .icon-node:hover {
          background: #F2F5FF;
          border-color: #BAC7FF;
          transform: translateY(-2px);
        }
      `}</style>

      {/* 1. WHISPER-QUIET MINIMAL NAVIGATION */}
      <header className="w-full max-w-6xl mx-auto px-6 sm:px-10 pt-7 pb-3 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onStartApp}
          className="text-[17px] font-semibold tracking-[-0.02em] text-[#111317] hover:opacity-75 transition-opacity"
        >
          Hunch
        </button>
        <button
          type="button"
          onClick={onStartApp}
          className="text-[14px] font-medium text-[#68707C] hover:text-[#111317] transition-colors inline-flex items-center gap-1"
        >
          <span>Open app</span>
          <span className="text-xs">↗</span>
        </button>
      </header>

      {/* 2. CENTERPIECE: MUSE-STYLE TYPOGRAPHY LOCKUP */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 pt-8 sm:pt-12 pb-10">
        {/* Subtle Minimal Brand Scribble Mark Above Headline (Echoing Muse Reference) */}
        <div className="mb-6 sm:mb-8">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#5B78FF]" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 34C14.5 22 18 13 20.5 13C23 13 19.5 31 22.5 31C25.5 31 29.5 18 32.5 18C35.5 18 33 32 36.5 32C38.8 32 40.5 28.5 42 25"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 2-Line Display Headline with Inline 3D Hunch Orb & Craving Tag */}
        <h1 className="text-center font-semibold text-[#111317] text-[2.65rem] sm:text-[4.25rem] md:text-[5.1rem] leading-[1.08] tracking-[-0.04em] max-w-4xl mx-auto select-none">
          {/* Line 1 */}
          <span className="inline-flex items-center justify-center flex-wrap gap-x-2 sm:gap-x-3">
            <span>Hunch</span>

            {/* Single Inline 3D Hunch Orb Mascot */}
            <span className="inline-flex flex-col items-center justify-center align-middle mx-0.5 sm:mx-1">
              <span className="w-12 h-12 sm:w-[72px] sm:h-[72px] md:w-[82px] md:h-[82px] rounded-full hunch-orb orb-float flex flex-col items-center justify-center">
                {/* Eyes with top-left white catchlights */}
                <span className="orb-eyes flex items-center gap-2.5 sm:gap-4 mt-0.5">
                  <span className="w-2 sm:w-3 h-2.5 sm:h-4 bg-[#23252E] rounded-full relative">
                    <span className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-white rounded-full absolute top-0.5 left-0.5"></span>
                  </span>
                  <span className="w-2 sm:w-3 h-2.5 sm:h-4 bg-[#23252E] rounded-full relative">
                    <span className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-white rounded-full absolute top-0.5 left-0.5"></span>
                  </span>
                </span>
                {/* Tiny curved smile */}
                <svg className="w-2.5 sm:w-4 h-1.5 sm:h-2 mt-1 text-[#23252E]" viewBox="0 0 16 8" fill="none">
                  <path d="M3 2.2C4.8 6 11.2 6 13 2.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </span>
              {/* Subtle oval floor shadow */}
              <span className="w-8 sm:w-12 h-1.5 rounded-full bg-black/10 mt-1"></span>
            </span>

            <span>, AI that</span>
          </span>

          <br />

          {/* Line 2 */}
          <span className="inline-flex items-center justify-center flex-wrap gap-x-2.5 sm:gap-x-3.5 mt-1 sm:mt-1.5">
            <span>sorts your cravings</span>

            {/* Clean Tactile Food Cloche — Black & White, No Border, Subtly Dimmed */}
            <span className="inline-flex items-center justify-center align-middle w-11 h-11 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] -rotate-6 opacity-80 transition-all duration-300 hover:rotate-0 hover:opacity-100">
              <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Borderless Monochrome Cloche Card */}
                <rect x="6" y="14" width="52" height="38" rx="12" fill="url(#ticketGradBW)" />
                <path d="M18 36C18 27.7157 24.268 21 32 21C39.732 21 46 27.7157 46 36H18Z" fill="#FFFFFF" fillOpacity="0.95" />
                <circle cx="32" cy="18.5" r="2.5" fill="#FFFFFF" />
                <rect x="15" y="36" width="34" height="3.5" rx="1.75" fill="#18181B" />
                <defs>
                  <linearGradient id="ticketGradBW" x1="6" y1="14" x2="58" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ECECED" />
                    <stop offset="1" stopColor="#DFDFE2" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </span>
        </h1>

        {/* 3. REFINED SUBTITLE & SINGLE PRIMARY CTA */}
        <p className="mt-6 sm:mt-7 text-[17px] sm:text-[19px] text-[#687082] font-normal tracking-[-0.015em] text-center">
          Stop scrolling menus. Just ask and eat.
        </p>

        <div className="mt-7 sm:mt-8">
          <button
            type="button"
            onClick={onStartApp}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#141519] hover:bg-[#25272E] text-white text-[15px] font-medium tracking-[-0.01em] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <span>Try Hunch</span>
            <span className="text-white/70 text-sm">→</span>
          </button>
        </div>

        {/* 4. SILENT HORIZONTAL MOVING SVG ICON STRIP + CAPTION */}
        <div className="mt-14 sm:mt-16 w-full max-w-[520px] mx-auto flex flex-col items-center">
          {/* Narrow Edge-Faded Marquee Container */}
          <div className="w-full overflow-hidden marquee-mask py-1">
            <div className="marquee-track gap-3.5">
              {/* SET 1: 10 Bespoke Multi-Layered Architectural SVGs */}
              <div className="flex items-center gap-3.5 pr-3.5">
                {/* 1. Steamed Momos */}
                <div className="icon-node" title="Steamed Momos">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M10 6.5C10 5.3 11 4.5 11 3.3M14 6C14 4.8 15 4 15 2.8M18 6.5C18 5.3 19 4.5 19 3.3" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                    <ellipse cx="14" cy="18.5" rx="8.5" ry="3.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" />
                    <path d="M5.5 18.5V21C5.5 22.9 9.3 24.5 14 24.5C18.7 24.5 22.5 22.9 22.5 21V18.5" stroke="#6E7891" strokeWidth="1.4" />
                    <path d="M9.5 17.5C9.5 14.8 11.5 13 14 13C16.5 13 18.5 14.8 18.5 17.5" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M12.2 13.5C12.6 14.8 13.2 16 13.5 17.2M15.8 13.5C15.4 14.8 14.8 16 14.5 17.2" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>

                {/* 2. Copper Handi / Butter Chicken Bowl */}
                <div className="icon-node" title="Butter Chicken Handi">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M6.5 13.5H21.5L20.2 20.2C19.6 22.7 17.1 24.2 14 24.2C10.9 24.2 8.4 22.7 7.8 20.2L6.5 13.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <ellipse cx="14" cy="13.5" rx="7.5" ry="2.3" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                    <path d="M4.5 13.5C5.2 13.5 6 14 6.5 14.8M23.5 13.5C22.8 13.5 22 14 21.5 14.8" stroke="#6E7891" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M12.5 9.5C12.5 7.8 14.2 6.8 15.8 7.8C16.8 8.5 16.2 10.2 14.5 10.5" fill="#8E9EFF" fillOpacity="0.35" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>

                {/* 3. Artisan Kathi Roll / Wrap */}
                <div className="icon-node" title="Kathi Roll">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M9.5 15.5L12.5 23.2C12.9 24.2 14.2 24.5 15.2 24L19.5 21.8C20.5 21.3 20.9 20 20.4 19L17.2 11.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <ellipse cx="13.2" cy="11.2" rx="4.8" ry="2.5" transform="rotate(-24 13.2 11.2)" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                    <circle cx="12.2" cy="11.2" r="1.2" fill="#8E9EFF" />
                    <circle cx="14.5" cy="10.4" r="1" fill="#6E7891" />
                    <path d="M10.8 18.5L18.2 15" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>

                {/* 4. Bistro Restaurant Awning */}
                <div className="icon-node" title="50+ Local Kitchens">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <rect x="6" y="12.5" width="16" height="11" rx="2" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                    <path d="M4.8 11.5L6.5 6.5H21.5L23.2 11.5H4.8Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M4.8 11.5C4.8 12.9 6 13.8 7.5 13.8C9 13.8 10.2 12.9 10.2 11.5C10.2 12.9 11.5 13.8 14 13.8C16.5 13.8 17.8 12.9 17.8 11.5C17.8 12.9 19 13.8 20.5 13.8C22 13.8 23.2 12.9 23.2 11.5" fill="#DCE4FF" stroke="#6E7891" strokeWidth="1.3" />
                    <rect x="11.5" y="16.8" width="5" height="6.7" rx="1" fill="#EEF2FF" stroke="#8E9EFF" strokeWidth="1.3" />
                  </svg>
                </div>

                {/* 5. Traditional Indian Thali */}
                <div className="icon-node" title="North Indian Thali">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="9.2" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" />
                    <circle cx="10.2" cy="10.8" r="2.1" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                    <circle cx="15" cy="9.5" r="2.1" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                    <circle cx="18.2" cy="12.8" r="2.1" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                    <path d="M9.5 16.8C9.5 15.2 11.5 14.5 13.8 14.5C16.1 14.5 18 15.8 18 17.5C18 19.2 16.1 20.2 13.8 20.2C11.5 20.2 9.5 18.5 9.5 16.8Z" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.3" />
                  </svg>
                </div>

                {/* 6. Wood-Fired Pizza Slice */}
                <div className="icon-node" title="Wood-Fired Pizza">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M7.5 8.2C11.8 5.6 17.2 5.8 21.2 8.8L13.5 23.2L7.5 8.2Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M6.8 6.8C11.5 4 17.8 4.2 22.2 7.5" stroke="#6E7891" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="13.8" cy="11.5" r="1.6" fill="#8E9EFF" />
                    <circle cx="15.6" cy="15.2" r="1.3" fill="#8E9EFF" />
                    <circle cx="11.8" cy="15.8" r="1.1" fill="#6E7891" />
                  </svg>
                </div>

                {/* 7. Chef's Silver Cloche Dome */}
                <div className="icon-node" title="Curated Daily Picks">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M6 19.5C6 14.2 9.6 10 14 10C18.4 10 22 14.2 22 19.5H6Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <circle cx="14" cy="8.2" r="1.6" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.4" />
                    <path d="M4.2 19.5H23.8" stroke="#6E7891" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M10 14.5C11.2 13.2 12.6 12.5 14.2 12.5" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>

                {/* 8. Steaming Ramen Bowl */}
                <div className="icon-node" title="Noodle Bowls">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M7.5 7.5L22.5 5.2M7.5 10.2L22.5 8.8" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M11 8V13.5M14 7.5V13.5" stroke="#6E7891" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M5.8 13.5H22.2C22.2 18.5 18.8 22.5 14 22.5C9.2 22.5 5.8 18.5 5.8 13.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M10.5 22.5H17.5" stroke="#6E7891" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>

                {/* 9. Craft Burger */}
                <div className="icon-node" title="Craft Burgers">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M6.5 13C6.5 9.2 9.8 6.8 14 6.8C18.2 6.8 21.5 9.2 21.5 13H6.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M5.5 15.8H22.5" stroke="#8E9EFF" strokeWidth="2" strokeLinecap="round" />
                    <rect x="6.5" y="18.2" width="15" height="3.6" rx="1.8" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                    <circle cx="12" cy="9.8" r="0.7" fill="#6E7891" />
                    <circle cx="15.5" cy="9.5" r="0.7" fill="#6E7891" />
                    <circle cx="13.8" cy="11" r="0.7" fill="#8E9EFF" />
                  </svg>
                </div>

                {/* 10. Tandoori Skewer */}
                <div className="icon-node" title="Tandoori & Grill">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M6.5 21.5L21.5 6.5" stroke="#6E7891" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="20.8" cy="7.2" r="1.6" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                    <rect x="14.2" y="10.2" width="4.4" height="4.4" rx="1.2" transform="rotate(45 16.4 12.4)" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.3" />
                    <rect x="10.2" y="14.2" width="4.4" height="4.4" rx="1.2" transform="rotate(45 12.4 16.4)" fill="#DCE4FF" stroke="#6E7891" strokeWidth="1.3" />
                  </svg>
                </div>
              </div>

              {/* SET 2: Duplicate Track for Seamless Infinite 35s Loop */}
              <div className="flex items-center gap-3.5 pr-3.5" aria-hidden="true">
                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M10 6.5C10 5.3 11 4.5 11 3.3M14 6C14 4.8 15 4 15 2.8M18 6.5C18 5.3 19 4.5 19 3.3" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                    <ellipse cx="14" cy="18.5" rx="8.5" ry="3.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" />
                    <path d="M5.5 18.5V21C5.5 22.9 9.3 24.5 14 24.5C18.7 24.5 22.5 22.9 22.5 21V18.5" stroke="#6E7891" strokeWidth="1.4" />
                    <path d="M9.5 17.5C9.5 14.8 11.5 13 14 13C16.5 13 18.5 14.8 18.5 17.5" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M12.2 13.5C12.6 14.8 13.2 16 13.5 17.2M15.8 13.5C15.4 14.8 14.8 16 14.5 17.2" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M6.5 13.5H21.5L20.2 20.2C19.6 22.7 17.1 24.2 14 24.2C10.9 24.2 8.4 22.7 7.8 20.2L6.5 13.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <ellipse cx="14" cy="13.5" rx="7.5" ry="2.3" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                    <path d="M4.5 13.5C5.2 13.5 6 14 6.5 14.8M23.5 13.5C22.8 13.5 22 14 21.5 14.8" stroke="#6E7891" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M12.5 9.5C12.5 7.8 14.2 6.8 15.8 7.8C16.8 8.5 16.2 10.2 14.5 10.5" fill="#8E9EFF" fillOpacity="0.35" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M9.5 15.5L12.5 23.2C12.9 24.2 14.2 24.5 15.2 24L19.5 21.8C20.5 21.3 20.9 20 20.4 19L17.2 11.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <ellipse cx="13.2" cy="11.2" rx="4.8" ry="2.5" transform="rotate(-24 13.2 11.2)" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                    <circle cx="12.2" cy="11.2" r="1.2" fill="#8E9EFF" />
                    <circle cx="14.5" cy="10.4" r="1" fill="#6E7891" />
                    <path d="M10.8 18.5L18.2 15" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <rect x="6" y="12.5" width="16" height="11" rx="2" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                    <path d="M4.8 11.5L6.5 6.5H21.5L23.2 11.5H4.8Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M4.8 11.5C4.8 12.9 6 13.8 7.5 13.8C9 13.8 10.2 12.9 10.2 11.5C10.2 12.9 11.5 13.8 14 13.8C16.5 13.8 17.8 12.9 17.8 11.5C17.8 12.9 19 13.8 20.5 13.8C22 13.8 23.2 12.9 23.2 11.5" fill="#DCE4FF" stroke="#6E7891" strokeWidth="1.3" />
                    <rect x="11.5" y="16.8" width="5" height="6.7" rx="1" fill="#EEF2FF" stroke="#8E9EFF" strokeWidth="1.3" />
                  </svg>
                </div>

                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="9.2" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" />
                    <circle cx="10.2" cy="10.8" r="2.1" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                    <circle cx="15" cy="9.5" r="2.1" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                    <circle cx="18.2" cy="12.8" r="2.1" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                    <path d="M9.5 16.8C9.5 15.2 11.5 14.5 13.8 14.5C16.1 14.5 18 15.8 18 17.5C18 19.2 16.1 20.2 13.8 20.2C11.5 20.2 9.5 18.5 9.5 16.8Z" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.3" />
                  </svg>
                </div>

                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M7.5 8.2C11.8 5.6 17.2 5.8 21.2 8.8L13.5 23.2L7.5 8.2Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M6.8 6.8C11.5 4 17.8 4.2 22.2 7.5" stroke="#6E7891" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="13.8" cy="11.5" r="1.6" fill="#8E9EFF" />
                    <circle cx="15.6" cy="15.2" r="1.3" fill="#8E9EFF" />
                    <circle cx="11.8" cy="15.8" r="1.1" fill="#6E7891" />
                  </svg>
                </div>

                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M6 19.5C6 14.2 9.6 10 14 10C18.4 10 22 14.2 22 19.5H6Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <circle cx="14" cy="8.2" r="1.6" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.4" />
                    <path d="M4.2 19.5H23.8" stroke="#6E7891" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M10 14.5C11.2 13.2 12.6 12.5 14.2 12.5" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M7.5 7.5L22.5 5.2M7.5 10.2L22.5 8.8" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M11 8V13.5M14 7.5V13.5" stroke="#6E7891" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M5.8 13.5H22.2C22.2 18.5 18.8 22.5 14 22.5C9.2 22.5 5.8 18.5 5.8 13.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M10.5 22.5H17.5" stroke="#6E7891" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M6.5 13C6.5 9.2 9.8 6.8 14 6.8C18.2 6.8 21.5 9.2 21.5 13H6.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M5.5 15.8H22.5" stroke="#8E9EFF" strokeWidth="2" strokeLinecap="round" />
                    <rect x="6.5" y="18.2" width="15" height="3.6" rx="1.8" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                    <circle cx="12" cy="9.8" r="0.7" fill="#6E7891" />
                    <circle cx="15.5" cy="9.5" r="0.7" fill="#6E7891" />
                    <circle cx="13.8" cy="11" r="0.7" fill="#8E9EFF" />
                  </svg>
                </div>

                <div className="icon-node">
                  <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                    <path d="M6.5 21.5L21.5 6.5" stroke="#6E7891" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="20.8" cy="7.2" r="1.6" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                    <rect x="14.2" y="10.2" width="4.4" height="4.4" rx="1.2" transform="rotate(45 16.4 12.4)" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.3" />
                    <rect x="10.2" y="14.2" width="4.4" height="4.4" rx="1.2" transform="rotate(45 12.4 16.4)" fill="#DCE4FF" stroke="#6E7891" strokeWidth="1.3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Small Silent Caption */}
          <p className="mt-3.5 text-[12.5px] font-medium text-[#8C94A6] tracking-[0.02em] select-none">
            50+ restaurants <span className="mx-1 text-[#C4CAD8]">·</span> over 400 dishes
          </p>
        </div>
      </main>

      {/* 4-STEP HOW IT WORKS FLOW */}
      <HowItWorksFlow />

      {/* THE ARCHITECTURE BEHIND HUNCH */}
      <ArchitectureSection />

      {/* FINAL CALL TO ACTION */}
      <section className="w-full bg-white py-16 sm:py-20 text-center flex flex-col items-center">
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#111317]">
          Hungry yet?
        </h3>
        <p className="mt-2 text-base text-[#687082]">
          One tap to your best meal tonight. No download required.
        </p>
        <button
          type="button"
          onClick={onStartApp}
          className="mt-6 inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#141519] hover:bg-[#25272E] text-white text-[15px] font-medium tracking-[-0.01em] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <span>Try Hunch now</span>
          <span className="text-white/70 text-sm">→</span>
        </button>
      </section>

      {/* WHISPER-QUIET FOOTER */}
      <footer className="w-full max-w-5xl mx-auto px-6 sm:px-10 py-12 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C94A6] font-mono gap-4 border-t border-[#F2F4F8]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#111317]">Hunch</span>
          <span>·</span>
          <span>Bangalore</span>
        </div>
        <div>
          <span>Zero menus · One decision, done</span>
        </div>
      </footer>
    </div>
  )
}
