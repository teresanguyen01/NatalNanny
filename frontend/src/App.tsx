import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RoleSelectionPage from './pages/RoleSelectionPage'
import DashboardPage from './pages/DashboardPage'
import DoctorDashboardPage from './pages/DoctorDashboardPage'
import MessagingPage from './pages/MessagingPage'
import CheckupPage from './pages/CheckupPage'
import CheckupResultsPage from './pages/CheckupResultsPage'
import PatientsPage from './pages/PatientsPage'
import SignupPage from './pages/SignupPage'
import SettingsPage from './pages/SettingsPage'
import RoleGate from './components/auth/RoleGate'

// Route dashboard based on role
function DashboardRouter() {
  const { role } = useAuth()
  return role === 'doctor' ? <DoctorDashboardPage /> : <DashboardPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/select-role" element={<RoleSelectionPage />} />
              <Route element={<RoleGate />}>
                <Route element={<AppShell />}>
                  <Route path="/dashboard" element={<DashboardRouter />} />
                  <Route path="/messaging" element={<MessagingPage />} />
                  <Route path="/checkup" element={<CheckupPage />} />
                  <Route path="/checkup/results" element={<CheckupResultsPage />} />
                  <Route path="/patients" element={<PatientsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
