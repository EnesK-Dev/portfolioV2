// type: 'grouped' -> renkli dış kutular, her kutuda aynı renk alt kartlar
// data: [{ group, note?, color?, items: [{ code, name, desc }] }]
const GROUP_COLORS = ['#ff5541', '#2f8f6b', '#cea72c', '#324879', '#9b6a8f']

function Grouped({ data }) {
  return (
    <div className="flex flex-col gap-8">
      {data.map((g, gi) => {
        const color = g.color || GROUP_COLORS[gi % GROUP_COLORS.length]
        return (
          <div key={gi} className="border-[3px]" style={{ borderColor: color, boxShadow: `6px 6px 0px ${color}` }}>
            {/* grup başlığı */}
            <div
              className="px-5 py-3 border-b-[3px] bg-surface-container-lowest flex items-center gap-3 flex-wrap"
              style={{ borderColor: color }}
            >
              <span className="inline-block w-3 h-3" style={{ background: color }} />
              <h3 className="font-headline-md text-headline-md font-bold uppercase tracking-tight" style={{ color }}>
                {g.group}
              </h3>
              {g.note && <span className="font-label-code text-label-code text-on-surface-variant sm:ml-auto">{g.note}</span>}
            </div>
            {/* alt kartlar (hepsi grup rengiyle) */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-surface-container">
              {g.items.map((it, i) => (
                <div key={i} className="border-2 bg-surface-container-lowest p-3 flex flex-col" style={{ borderColor: color }}>
                  <div className="flex items-baseline gap-2 flex-wrap border-b pb-1.5 mb-1.5" style={{ borderColor: color }}>
                    <span className="font-label-code text-headline-md font-bold leading-none" style={{ color }}>{it.code}</span>
                    <span className="text-headline-sm font-bold leading-none" style={{ color }}>→</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase leading-none">{it.name}</span>
                  </div>
                  {it.desc && <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{it.desc}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Grouped
