// Tema-uyumlu line-art katana — keskin/köşeli çizgiler, sivri uç
function Katana({ className = '', color = '#ff5541' }) {
  return (
    <svg viewBox="0 0 500 110" className={className} fill="none" aria-hidden="true">
      <g stroke={color} strokeLinejoin="miter" strokeLinecap="square">
        {/* namlu (blade) — köşeli, sivri uç */}
        <path d="M160 58 L470 40 L494 33 L473 51 L160 74 Z" strokeWidth="2.2" />
        {/* yokote (uç geçiş çizgisi) */}
        <path d="M451 43 L447 53" strokeWidth="1.6" />
        {/* hamon (su verme çizgisi) */}
        <path d="M176 70 L462 46" strokeWidth="1" />
        {/* habaki (bilezik) */}
        <path d="M164 59 L164 73 M171 58 L171 73" strokeWidth="1.8" />
        {/* tsuba (koruma) */}
        <rect x="144" y="46" width="12" height="40" strokeWidth="2.2" />
        {/* tsuka (sap) */}
        <path d="M34 62 L144 56 L144 76 L34 82 Z" strokeWidth="2.2" />
        {/* kashira (sap sonu) */}
        <path d="M26 62 L34 62 L34 82 L26 82 Z" strokeWidth="2.2" />
        {/* ito sargı — keskin çapraz X */}
        <g strokeWidth="1.4">
          <path d="M52 61 L72 81 M74 60 L94 80 M96 59 L116 79 M118 58 L138 78" />
          <path d="M72 61 L52 81 M94 60 L74 80 M116 59 L96 79 M138 58 L118 78" />
        </g>
      </g>
    </svg>
  )
}

export default Katana
