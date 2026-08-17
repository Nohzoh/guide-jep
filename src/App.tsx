import { HashRouter, Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { Browse } from './pages/Browse'
import { EventDetail } from './pages/EventDetail'
import { MyPlanning } from './pages/MyPlanning'

export default function App() {
  return (
    <HashRouter>
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/event/:uid" element={<EventDetail />} />
          <Route path="/planning" element={<MyPlanning />} />
        </Routes>
      </main>
      <Footer />
    </HashRouter>
  )
}
