// type: 'tree' -> parent-child agac/mindmap. Surukle-kaydir (pan) + zoom (yakinlastir/uzaklastir).
// Olculu yerlesim: her kutu metni kadar uzar, kardesler gercek yuksekligine gore dizilir (kirpma yok).
// data: { label, desc?, color?, children?: [ ...ayni sekil ] }  (tek kok dugum)
import { useMemo, useRef, useState, useLayoutEffect } from 'react'

const ACCENTS = ['#ff5541', '#2f8f6b', '#cea72c', '#324879', '#9b6a8f']
const NODE_W = 240   // dugum kutusu genisligi (yukseklik icerige gore degisken)
const COL_W = 320    // derinlik (seviye) arasi yatay mesafe
const V_GAP = 22     // kardes kutular arasi dikey bosluk
const PAD = 48       // tuval kenar boslugu

// data'yi: agac dugumleri (children baglantili) + duz liste (render/olcum icin) haline getir
function buildTree(root) {
  let idc = 0
  const list = []
  function walk(node, depth, inherited) {
    const color = depth === 0 ? null : (node.color || inherited) // kok notr
    const rec = {
      id: idc++,
      label: node.label,
      desc: node.desc,
      color,
      depth,
      x: PAD + depth * COL_W,
      children: [],
    }
    list.push(rec)
    const kids = Array.isArray(node.children) ? node.children : []
    rec.children = kids.map((k, idx) =>
      walk(k, depth + 1, depth === 0 ? ACCENTS[idx % ACCENTS.length] : color)
    )
    return rec
  }
  const treeRoot = walk(root, 0, null)
  return { treeRoot, list }
}

function Tree({ data }) {
  const root = data && !Array.isArray(data) && data.label
    ? data
    : { label: 'ROOT', children: Array.isArray(data) ? data : [] }

  const { treeRoot, list } = useMemo(() => buildTree(root), [data])

  const nodeRefs = useRef({})               // id -> DOM elemani (olcum icin)
  const boxRef = useRef(null)               // dis tuval (fit hesabi icin)
  const [L, setL] = useState({ pos: {}, width: 1200, height: 700, ready: false })

  const [off, setOff] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [grabbing, setGrabbing] = useState(false)
  const start = useRef(null)

  // --- olculu yerlesim: gercek yukseklikleri olcup y koordinatlarini hesapla ---
  useLayoutEffect(() => {
    const h = {}
    list.forEach((n) => { const el = nodeRefs.current[n.id]; h[n.id] = el ? el.offsetHeight : 52 })

    const pos = {}
    let cursor = PAD
    function assign(n) {
      if (n.children.length === 0) {
        pos[n.id] = { y: cursor, h: h[n.id] }
        cursor += h[n.id] + V_GAP
      } else {
        n.children.forEach(assign)
        const f = pos[n.children[0].id]
        const l = pos[n.children[n.children.length - 1].id]
        const center = (f.y + f.h / 2 + l.y + l.h / 2) / 2
        pos[n.id] = { y: center - h[n.id] / 2, h: h[n.id] }
      }
    }
    assign(treeRoot)

    let maxX = 0, maxY = 0
    list.forEach((n) => { maxX = Math.max(maxX, n.x + NODE_W); maxY = Math.max(maxY, pos[n.id].y + pos[n.id].h) })
    setL({ pos, width: maxX + PAD, height: maxY + PAD, ready: true })
  }, [list])

  // kenarlar (baglanti cizgileri) — olculen konumlardan
  const edges = useMemo(() => {
    if (!L.ready) return []
    const es = []
    list.forEach((n) => n.children.forEach((c) => {
      const a = L.pos[n.id], b = L.pos[c.id]
      if (!a || !b) return
      es.push({ x1: n.x + NODE_W, y1: a.y + a.h / 2, x2: c.x, y2: b.y + b.h / 2, color: c.color || '#8a8a8a' })
    }))
    return es
  }, [L, list])

  // --- pan ---
  const begin = (cx, cy) => { start.current = { cx, cy, ox: off.x, oy: off.y }; setGrabbing(true) }
  const move = (cx, cy) => {
    if (!start.current) return
    setOff({ x: start.current.ox + cx - start.current.cx, y: start.current.oy + cy - start.current.cy })
  }
  const end = () => { start.current = null; setGrabbing(false) }

  // --- zoom ---
  const zoomBy = (d) => setZoom((z) => Math.min(2, Math.max(0.3, +(z + d).toFixed(2))))
  const reset = () => { setZoom(1); setOff({ x: 0, y: 0 }) }
  const fit = () => {
    const c = boxRef.current
    if (!c || !L.ready) return
    const z = Math.min((c.clientWidth - 24) / L.width, (c.clientHeight - 24) / L.height, 1)
    setZoom(z > 0.3 ? +z.toFixed(2) : 0.3)
    setOff({ x: 12, y: 12 })
  }
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return // sadece Ctrl/Cmd+tekerlek ile zoom (normal kaydirma serbest)
    e.preventDefault()
    zoomBy(e.deltaY < 0 ? 0.1 : -0.1)
  }

  const btn = 'w-8 h-8 flex items-center justify-center font-label-code text-mono-md font-bold bg-surface-container-high border border-on-surface text-on-surface hover:text-primary-container'

  return (
    <div className="relative">
      <div className="flex items-center mb-2">
        <span className="font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">🖐 sürükle · ⊕ zoom</span>
      </div>

      <div
        ref={boxRef}
        className="relative overflow-hidden select-none"
        style={{ height: '82vh', cursor: grabbing ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={(e) => begin(e.clientX, e.clientY)}
        onMouseMove={(e) => move(e.clientX, e.clientY)}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => begin(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY) }}
        onTouchEnd={end}
        onWheel={onWheel}
      >
        {/* SAG TARAF: zoom kontrolleri */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1" onMouseDown={(e) => e.stopPropagation()}>
          <button type="button" className={btn} onClick={() => zoomBy(0.15)} title="Yakınlaştır">＋</button>
          <button type="button" className={btn} onClick={() => zoomBy(-0.15)} title="Uzaklaştır">－</button>
          <button type="button" className={btn} onClick={fit} title="Sığdır">⤢</button>
          <button type="button" className={btn} onClick={reset} title="Sıfırla">⟲</button>
          <span className="mt-1 text-center font-label-code text-label-code text-on-surface-variant">{Math.round(zoom * 100)}%</span>
        </div>

        <div
          className="absolute top-0 left-0"
          style={{ width: L.width, height: L.height, transform: `translate(${off.x}px, ${off.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {/* baglanti cizgileri */}
          <svg width={L.width} height={L.height} className="absolute top-0 left-0 pointer-events-none" style={{ overflow: 'visible' }}>
            {edges.map((e, i) => {
              const mx = (e.x1 + e.x2) / 2
              return (
                <path key={i} d={`M ${e.x1} ${e.y1} C ${mx} ${e.y1}, ${mx} ${e.y2}, ${e.x2} ${e.y2}`} fill="none" stroke={e.color} strokeWidth="2.5" />
              )
            })}
          </svg>

          {/* dugumler — olcum icin hep render, hazir olunca gorunur */}
          {list.map((n) => (
            <div
              key={n.id}
              ref={(el) => { nodeRefs.current[n.id] = el }}
              className="absolute"
              style={{ left: n.x, top: L.pos[n.id] ? L.pos[n.id].y : 0, width: NODE_W, opacity: L.ready ? 1 : 0 }}
            >
              <div
                className={`border-2 px-3 py-2 bg-surface-container-lowest ${n.color ? '' : 'border-on-surface'}`}
                style={n.color
                  ? { borderColor: n.color, boxShadow: `4px 4px 0px ${n.color}` }
                  : { boxShadow: '4px 4px 0px var(--c-on)' }}
              >
                <div className="font-label-code text-mono-md font-bold uppercase leading-tight break-words" style={n.color ? { color: n.color } : undefined}>
                  {n.label}
                </div>
                {n.desc && (
                  <div className="font-body-md text-body-md text-on-surface-variant mt-1 leading-snug">{n.desc}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Tree
