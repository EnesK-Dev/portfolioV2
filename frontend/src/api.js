// Tek kaynak: backend API adresi.
// Dev'de VITE_API_URL tanimli degilse localhost'a duser;
// prod'da `vite build` sirasinda .env(.production) icindeki VITE_API_URL kullanilir.
export const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
