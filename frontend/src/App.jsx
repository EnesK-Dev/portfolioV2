import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Admin from './pages/Admin.jsx'
import Notes from './pages/Notes.jsx'

// App artik "router": URL'ye gore hangi sayfa gosterilsin ona karar verir
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/notlar" element={<Notes />} />
      <Route path="/notlar/:slug" element={<Notes />} />
    </Routes>
  )
}

export default App
