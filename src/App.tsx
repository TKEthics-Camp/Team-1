import { Routes, Route } from 'react-router'
import HomeScreen from './pages/HomeScreen'
import InterestScreen from './pages/InterestScreen'
import ProfileScreen from './pages/ProfileScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#f3efe6] text-[#4a4640] sm:border-x sm:border-[#e7e2d4]">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/interest/:id" element={<InterestScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
