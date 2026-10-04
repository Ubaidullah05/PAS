import { Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Shell from './components/Shell';
import ProtectedRoute from './components/ProtectedRoute';
import Toasts from './components/Toasts';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import HowItWorks from './pages/HowItWorks';
import Help from './pages/Help';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import Apply from './pages/Apply';
import ApplicationDetail from './pages/ApplicationDetail';
import Appointments from './pages/Appointments';
import Profile from './pages/Profile';
import Queue from './pages/Queue';
import AllApplications from './pages/AllApplications';
import Reports from './pages/Reports';
import AdminHome from './pages/admin/AdminHome';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOffices from './pages/admin/AdminOffices';
import AdminSlots from './pages/admin/AdminSlots';
import AdminAudit from './pages/admin/AdminAudit';
import NotFound from './pages/NotFound';

function PublicLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/help" element={<Help />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/applications" element={<Applications />} />
          <Route
            path="/applications/new"
            element={
              <ProtectedRoute roles={['applicant']}>
                <Apply />
              </ProtectedRoute>
            }
          />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/reports" element={<Reports />} />

          <Route
            path="/console/verifications"
            element={
              <ProtectedRoute roles={['verifier', 'admin']}>
                <Queue queue="verification" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/console/approvals"
            element={
              <ProtectedRoute roles={['officer', 'admin']}>
                <Queue queue="approval" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/console/applications"
            element={
              <ProtectedRoute permission="application:read:any">
                <AllApplications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute permission="user:manage">
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/offices"
            element={
              <ProtectedRoute permission="office:manage">
                <AdminOffices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/slots"
            element={
              <ProtectedRoute permission="appointment:slots">
                <AdminSlots />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute permission="audit:view">
                <AdminAudit />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toasts />
    </>
  );
}
