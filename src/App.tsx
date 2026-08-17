import { HashRouter, Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { Browse } from './pages/Browse'
import { EventDetail } from './pages/EventDetail'
import { ImportPlan } from './pages/ImportPlan'
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
          <Route path="/import" element={<ImportPlan />} />
        </Routes>
      </main>
      <Footer />
    </HashRouter>
  )
}
