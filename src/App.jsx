import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { CampusAdminRoute, StudentRoute, SuperAdminRoute } from './components/RoleRoute'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import DashboardHome from './pages/DashboardHome'
import ResourceExchange from './pages/exchange/ResourceExchange'
import ItemDetail from './pages/exchange/ItemDetail'
import PostingHub from './pages/PostingHub'
import UploadItem from './pages/exchange/UploadItem'
import BorrowCenter from './pages/borrow/BorrowCenter'
import FoodRescue from './pages/food/FoodRescue'
import UploadFood from './pages/food/UploadFood'
import FoodDetail from './pages/food/FoodDetail'
import Favorites from './pages/Favorites'
import CommunityAction from './pages/community/CommunityAction'
import CommunityEventDetail from './pages/community/CommunityEventDetail'
import CommunityVolunteerDetail from './pages/community/CommunityVolunteerDetail'
import ImpactDashboard from './pages/ImpactDashboard'
import AnnouncementsPage from './pages/AnnouncementsPage'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import CampusAdminHome from './pages/admin/CampusAdminHome'
import CampusUsers from './pages/admin/CampusUsers'
import CampusItems from './pages/admin/CampusItems'
import CampusFoods from './pages/admin/CampusFoods'
import CampusCommunity from './pages/admin/CampusCommunity'
import CampusImpact from './pages/admin/CampusImpact'
import CampusOrganizations from './pages/admin/CampusOrganizations'
import CampusAnnouncements from './pages/admin/CampusAnnouncements'
import CampusAdminProfile from './pages/admin/CampusAdminProfile'
import SuperAdminHome from './pages/admin/SuperAdminHome'
import UniversitiesAdmin from './pages/admin/UniversitiesAdmin'
import CampusAdminsPage from './pages/admin/CampusAdminsPage'
import SuperCategories from './pages/admin/SuperCategories'
import SuperAiSettings from './pages/admin/SuperAiSettings'
import SuperNationalAnalytics from './pages/admin/SuperNationalAnalytics'
import SuperAdminProfile from './pages/admin/SuperAdminProfile'

function AppProviders({ children }) {
  return (
    <AuthProvider>
      <DataProvider>{children}</DataProvider>
    </AuthProvider>
  )
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<StudentRoute />}>
            <Route path="/app" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="exchange" element={<ResourceExchange />} />
              <Route path="exchange/upload" element={<Navigate to="/app/posting/barang" replace />} />
              <Route path="exchange/:id" element={<ItemDetail />} />
              <Route path="posting" element={<PostingHub />} />
              <Route path="posting/barang" element={<UploadItem />} />
              <Route path="posting/makanan" element={<UploadFood />} />
              <Route path="add" element={<Navigate to="/app/posting" replace />} />
              <Route path="borrow" element={<BorrowCenter />} />
              <Route path="borrow/upload" element={<Navigate to="/app/posting/barang?type=borrow" replace />} />
              <Route path="donate" element={<Navigate to="/app/exchange?type=donate" replace />} />
              <Route path="donate/upload" element={<Navigate to="/app/posting/barang?type=donate" replace />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="food" element={<FoodRescue />} />
              <Route path="food/upload" element={<Navigate to="/app/posting/makanan" replace />} />
              <Route path="food/:id" element={<FoodDetail />} />
              <Route path="community" element={<CommunityAction />} />
              <Route path="community/events/:id" element={<CommunityEventDetail />} />
              <Route path="community/volunteers/:id" element={<CommunityVolunteerDetail />} />
              <Route path="impact" element={<ImpactDashboard />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>

          <Route element={<CampusAdminRoute />}>
            <Route path="/admin/campus" element={<AdminLayout variant="campus" />}>
              <Route index element={<CampusAdminHome />} />
              <Route path="users" element={<CampusUsers />} />
              <Route path="organizations" element={<CampusOrganizations />} />
              <Route path="items" element={<CampusItems />} />
              <Route path="foods" element={<CampusFoods />} />
              <Route path="community" element={<CampusCommunity />} />
              <Route path="impact" element={<CampusImpact />} />
              <Route path="announcements" element={<CampusAnnouncements />} />
              <Route path="profile" element={<CampusAdminProfile />} />
            </Route>
          </Route>

          <Route element={<SuperAdminRoute />}>
            <Route path="/admin/super" element={<AdminLayout variant="super" />}>
              <Route index element={<SuperAdminHome />} />
              <Route path="universities" element={<UniversitiesAdmin />} />
              <Route path="admins" element={<CampusAdminsPage />} />
              <Route path="categories" element={<SuperCategories />} />
              <Route path="ai-settings" element={<SuperAiSettings />} />
              <Route path="analytics" element={<SuperNationalAnalytics />} />
              <Route path="profile" element={<SuperAdminProfile />} />
              <Route path="users" element={<Navigate to="/admin/super" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '0',
            border: '1px solid #c9dbd3',
            background: '#fff',
            color: '#14201c',
            fontFamily: 'Source Sans 3 Variable, sans-serif',
            boxShadow: '0 10px 30px rgba(15, 92, 76, 0.1)',
          },
          success: {
            iconTheme: { primary: '#0f5c4c', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#c0392b', secondary: '#fff' },
          },
        }}
      />
    </AppProviders>
  )
}
