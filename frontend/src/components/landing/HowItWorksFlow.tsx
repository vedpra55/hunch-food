/**
 * How Hunch Works — 2-Column Grid
 * Inspired by modern minimal product cards (sleek, calm, small visuals, white bg, short punchy copy).
 * Strictly shadow-free, borderless, matching Hunch design system.
 */

function ChatVisual() {
  return (
    <div className="flex flex-col items-center gap-2 select-none w-full max-w-[260px]">
      {/* User message pill */}
      <div
        style={{ borderRadius: '16px' }}
        className="bg-white px-3.5 py-2 rounded-[16px] flex items-center gap-2 self-end"
      >
        <span className="text-[13px] font-medium text-[#111317]">
          “Spicy momos under ₹150”
        </span>
      </div>

      {/* Hunch reply pill */}
      <div
        style={{ borderRadius: '16px' }}
        className="bg-white px-3.5 py-2 rounded-[16px] flex items-center gap-2 self-start"
      >
        <div className="size-4 rounded-full hunch-orb shrink-0 flex items-center justify-center">
          <div className="flex items-center gap-0.5">
            <span className="size-0.5 rounded-full bg-[#23252E]"></span>
            <span className="size-0.5 rounded-full bg-[#23252E]"></span>
          </div>
        </div>
        <span className="text-[12.5px] text-[#687082]">
          Kurkure Momos · ₹125
        </span>
        <span className="rounded-full bg-emerald-50 text-emerald-600 text-[10.5px] font-mono font-semibold px-2 py-0.5">
          17 min
        </span>
      </div>
    </div>
  )
}

function MemoryVisual() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 max-w-[280px] select-none">
      <span
        style={{ borderRadius: '999px' }}
        className="bg-white rounded-full px-3 py-1.5 text-[12px] font-medium text-[#111317] flex items-center gap-1.5"
      >
        <span className="text-emerald-500 font-bold text-[11px]">✓</span>
        <span>Thursday Pure Veg</span>
      </span>

      <span
        style={{ borderRadius: '999px' }}
        className="bg-white rounded-full px-3 py-1.5 text-[12px] font-medium text-[#111317] flex items-center gap-1.5"
      >
        <span className="text-[#5B78FF] text-[11px]">🌶</span>
        <span>Medium spice</span>
      </span>

      <span
        style={{ borderRadius: '999px' }}
        className="bg-white rounded-full px-3 py-1.5 text-[12px] font-medium text-[#111317] flex items-center gap-1.5"
      >
        <span className="text-amber-500 text-[11px]">★</span>
        <span>Biryani is favourite</span>
      </span>

      <span
        style={{ borderRadius: '999px' }}
        className="bg-white rounded-full px-3 py-1.5 text-[12px] font-medium text-[#687082] flex items-center gap-1.5"
      >
        <span>No green chillies</span>
      </span>
    </div>
  )
}

function PicksVisual() {
  return (
    <div
      style={{ borderRadius: '20px' }}
      className="bg-white rounded-[20px] p-3.5 w-full max-w-[260px] select-none flex flex-col gap-2"
    >
      <div className="flex items-center justify-between text-[10.5px] font-mono text-[#8C94A6]">
        <span>2:00 PM · LUNCH PICK</span>
        <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
          ₹50 OFF
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <img
          src="https://images.unsplash.com/photo-1742599361498-79824d24e355?w=96&h=96&fit=crop&crop=entropy&auto=format&q=80"
          alt="Butter Chicken"
          className="size-9 rounded-full object-cover shrink-0 ring-1 ring-black/[0.04]"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#111317] leading-tight truncate">
            Butter Chicken + 2 Naan
          </p>
          <p className="text-[11px] text-[#8C94A6] leading-tight mt-0.5 truncate">
            Chaheru Da Dhaba · 27 min
          </p>
        </div>
      </div>
    </div>
  )
}

function ControlVisual() {
  return (
    <div className="flex flex-col items-center gap-2 select-none w-full max-w-[260px]">
      {/* Live tracking bar */}
      <div
        style={{ borderRadius: '16px' }}
        className="bg-white rounded-[16px] px-3.5 py-2 w-full flex items-center justify-between text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-[#111317] text-[12.5px]">Momo Junction cooking</span>
        </div>
        <span className="font-mono text-[11px] text-[#5B78FF]">17 min</span>
      </div>

      {/* Instant cancel response */}
      <div
        style={{ borderRadius: '16px' }}
        className="bg-white rounded-[16px] px-3.5 py-2 w-full flex items-center justify-between text-xs"
      >
        <span className="text-[12px] text-[#687082]">“Cancel my order”</span>
        <span className="text-rose-600 font-semibold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full">
          Instant refund
        </span>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    title: 'Chat to order',
    subtext: 'Say what you crave. No scrolling through menus.',
    visual: <ChatVisual />,
  },
  {
    title: 'Taste memory',
    subtext: 'Remembers your spice level, diet rules, and favorites.',
    visual: <MemoryVisual />,
  },
  {
    title: 'Daily picks',
    subtext: 'One fresh recommendation for right now, with real discounts.',
    visual: <PicksVisual />,
  },
  {
    title: 'Total control',
    subtext: 'Track live or cancel instantly with zero questions.',
    visual: <ControlVisual />,
  },
]

export function HowItWorksFlow() {
  return (
    <section className="w-full bg-[#FAFBFD] py-20 sm:py-28">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 flex flex-col items-center">
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto flex flex-col items-center mb-12 sm:mb-16">
          <span className="text-[11px] font-semibold text-[#5B78FF] uppercase tracking-widest font-mono mb-2">
            How Hunch Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em] text-[#111317] leading-tight">
            Food ordering that feels like conversation.
          </h2>
        </div>

        {/* 2-Column Grid on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 w-full">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              style={{ backgroundColor: '#ffffff', borderRadius: '28px' }}
              className="bg-white rounded-[28px] p-6 sm:p-7 flex flex-col justify-between min-h-[320px] sm:min-h-[350px]"
            >
              {/* Top: Calm centered small visual inside soft well */}
              <div
                style={{ borderRadius: '20px' }}
                className="w-full bg-[#F8F9FA] rounded-[20px] py-7 px-4 flex items-center justify-center select-none"
              >
                {feature.visual}
              </div>

              {/* Bottom: Clear Title + 1-Line Sub-text */}
              <div className="flex flex-col items-start gap-1.5 pt-5 pb-1">
                <h3 className="text-xl sm:text-[22px] font-semibold text-[#111317] tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-[14.5px] sm:text-[15px] text-[#687082] leading-normal font-normal">
                  {feature.subtext}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
