// Port notunu (type: 'ports') site temasina uygun kartlarla render eder
const ACCENTS = ['#ff5541', '#324879', '#cea72c'] // kirmizi, indigo, altin

function PortsGrid({ data }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map((p, i) => {
        const accent = ACCENTS[i % ACCENTS.length]
        return (
          <div
            key={p.port + p.name}
            className="bg-surface-container border-2 border-on-surface flex flex-col"
            style={{ boxShadow: `6px 6px 0px ${accent}` }}
          >
            {/* ust band: PORT (buyuk) -> ad */}
            <div className="border-b-2 border-on-surface px-4 py-3 bg-surface-container-lowest flex items-baseline gap-2 flex-wrap">
              <span className="font-label-code text-headline-md font-bold leading-none whitespace-nowrap" style={{ color: accent }}>
                {p.port}
              </span>
              <span className="text-headline-sm font-bold leading-none" style={{ color: accent }}>→</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase leading-none">
                {p.name}
              </span>
            </div>

            <div className="p-4 space-y-3 flex-1">
              {/* tam adi */}
              <p className="font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">
                {p.full}
              </p>
              {/* ne / neden */}
              <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                {p.desc}
              </p>
              {/* LOG / SOC notu — aksan renkli kenarlikli kutu */}
              <div className="pl-3 border-l-2" style={{ borderColor: accent }}>
                <span className="font-label-code text-label-code font-bold uppercase tracking-widest text-on-surface-variant">
                  LOG / SOC
                </span>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mt-1">
                  {p.log}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PortsGrid
