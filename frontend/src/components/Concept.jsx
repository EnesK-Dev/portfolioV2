// type: 'concept' -> baslikli bolumlerle kavram anlatimi
// data: [{ heading?, body }]
const ACCENTS = ['#ff5541', '#324879', '#cea72c']

function Concept({ data }) {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {data.map((sec, i) => (
        <div key={i} className="border-l-4 pl-4" style={{ borderColor: ACCENTS[i % ACCENTS.length] }}>
          {sec.heading && (
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase mb-2">{sec.heading}</h3>
          )}
          <p className="font-body-lg text-body-lg text-on-surface leading-relaxed whitespace-pre-line">{sec.body}</p>
        </div>
      ))}
    </div>
  )
}

export default Concept
