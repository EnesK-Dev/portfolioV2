// type: 'cheatsheet' -> komut/kisayol + aciklama listesi
// data: [{ cmd, desc }]
const ACCENTS = ['#ff5541', '#324879', '#cea72c']

function CheatList({ data }) {
  return (
    <div className="flex flex-col gap-3">
      {data.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_2fr] bg-surface-container border-2 border-on-surface"
          style={{ boxShadow: `4px 4px 0px ${ACCENTS[i % ACCENTS.length]}` }}
        >
          <div
            className="bg-surface-container-lowest border-b-2 sm:border-b-0 sm:border-r-2 border-on-surface px-4 py-3 font-label-code text-mono-md font-bold break-all"
            style={{ color: ACCENTS[i % ACCENTS.length] }}
          >
            {row.cmd}
          </div>
          <div className="px-4 py-3 font-body-md text-body-md text-on-surface leading-relaxed">{row.desc}</div>
        </div>
      ))}
    </div>
  )
}

export default CheatList
