import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import useParentAuthStore from './store/parentAuthStore'
import Layout from './components/Layout'
import ParentLayout from './components/ParentLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Centers from './pages/Centers'
import CenterDetail from './pages/CenterDetail'
import Students from './pages/Students'
import StudentDetail from './pages/StudentDetail'
import Blocking from './pages/Blocking'
import Activity from './pages/Activity'
import ActivityCategories from './pages/ActivityCategories'
import AdminManagement from './pages/AdminManagement'
import Policies from './pages/Policies'
import Live from './pages/Live'
import Commands from './pages/Commands'
import Parents from './pages/Parents'
import ParentDetail from './pages/ParentDetail'
import AdminDetail from './pages/AdminDetail'
import Settings from './pages/Settings'
import ParentLogin from './pages/ParentLogin'
import ParentDashboard from './pages/ParentDashboard'
import ParentChangePassword from './pages/ParentChangePassword'

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function ProtectedParentRoute({ children }) {
  const isAuthenticated = useParentAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/parent/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/parent/login" element={<ParentLogin />} />
      <Route
        path="/parent"
        element={
          <ProtectedParentRoute>
            <ParentLayout />
          </ProtectedParentRoute>
        }
      >
        <Route index element={<ParentDashboard />} />
        <Route path="change-password" element={<ParentChangePassword />} />
      </Route>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="centers" element={<Centers />} />
        <Route path="centers/:id" element={<CenterDetail />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="parents" element={<Parents />} />
        <Route path="parents/:id" element={<ParentDetail />} />
        <Route path="blocking" element={<Blocking />} />
        <Route path="activity" element={<Activity />} />
        <Route path="activity-categories" element={<ActivityCategories />} />
        <Route path="admins" element={<AdminManagement />} />
        <Route path="admins/:id" element={<AdminDetail />} />
        <Route path="policies" element={<Policies />} />
        <Route path="live" element={<Live />} />
        <Route path="commands" element={<Commands />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
