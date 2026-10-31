// type: 'steps' -> numarali dikey adimlar
// data: [{ title?, text }]
const ACCENTS = ['#ff5541', '#324879', '#cea72c']

function Steps({ data }) {
  return (
    <div className="flex flex-col gap-4">
      {data.map((s, i) => {
        const accent = ACCENTS[i % ACCENTS.length]
        return (
          <div
            key={i}
            className="flex gap-4 bg-surface-container border-2 border-on-surface p-5"
            style={{ boxShadow: `4px 4px 0px ${accent}` }}
          >
            <div className="font-headline-lg text-headline-md font-bold leading-none shrink-0" style={{ color: accent }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div>
              {s.title && <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase mb-1">{s.title}</h3>}
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">{s.text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Steps
