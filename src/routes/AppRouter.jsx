import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import RootLayout from "../layouts/RootLayout";
import AdminLayout from "../layouts/AdminLayout";
import ScrollToTop from "../components/layout/ScrollToTop";
import LoadingScreen from "../components/common/LoadingScreen";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { NavigationDisabledPage } from "../components/auth/NavigationRouteGuard";

const HomePage = lazy(() => import("../pages/home/HomePage"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const ProfilePage = lazy(() => import("../pages/profile/ProfilePage"));
const VillagePage = lazy(() => import("../pages/village/VillagePage"));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage"));
const SearchPage = lazy(() => import("../pages/search/SearchPage"));
const PostPage = lazy(() => import("../pages/post/PostPage"));
const StaticPage = lazy(() => import("../pages/static/StaticPage"));
const AboutUsPage = lazy(() => import("../pages/static/AboutUsPage"));
const CommunityGuidelinesPage = lazy(() => import("../pages/static/CommunityGuidelinesPage"));
const PrivacyPolicyPage = lazy(() => import("../pages/static/PrivacyPolicyPage"));
const TermsConditionsPage = lazy(() => import("../pages/static/TermsConditionsPage"));
const ContactUsPage = lazy(() => import("../pages/static/ContactUsPage"));
const HelpCenterPage = lazy(() => import("../pages/help-center/HelpCenterPage"));
const HelpCenterArticlePage = lazy(() => import("../pages/help-center/HelpCenterArticlePage"));
const NewsListPage = lazy(() => import("../pages/news/NewsListPage"));
const NewsDetailPage = lazy(() => import("../pages/news/NewsDetailPage"));
const BusinessDirectoryPage = lazy(() => import("../pages/business/BusinessDirectoryPage"));
const BusinessCategoryPage = lazy(() => import("../pages/business/BusinessCategoryPage"));
const BusinessRegisterPage = lazy(() => import("../pages/business/BusinessRegisterPage"));
const MyBusinessesPage = lazy(() => import("../pages/business/MyBusinessesPage"));
const BusinessDetailPage = lazy(() => import("../pages/business/BusinessDetailPage"));
const SuggestionsPage = lazy(() => import("../pages/SuggestionsPage"));
const AllSupportersPage = lazy(() => import("../pages/AllSupportersPage"));
const DonationPage = lazy(() => import("../pages/donation/DonationPage"));

const AdminDashboardPage = lazy(() => import("../admin/dashboard/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("../admin/users/AdminUsersPage"));
const AdminDeletedUsersPage = lazy(() => import("../admin/deleted-users/AdminDeletedUsersPage"));
const AdminPostsPage = lazy(() => import("../admin/posts/AdminPostsPage"));
const AdminPollsPage = lazy(() => import("../admin/polls/AdminPollsPage"));
const AdminVillagesPage = lazy(() => import("../admin/villages/AdminVillagesPage"));
const AdminReportsPage = lazy(() => import("../admin/reports/AdminReportsPage"));
const AdminBlueTicksPage = lazy(() => import("../admin/blue-ticks/AdminBlueTicksPage"));
const AdminSettingsPage = lazy(() => import("../admin/settings/AdminSettingsPage"));
const AdminCmsPage = lazy(() => import("../admin/cms/AdminCmsPage"));
const AdminHelpCenterPage = lazy(() => import("../admin/help-center/AdminHelpCenterPage"));
const AdminNewsPage = lazy(() => import("../admin/news/AdminNewsPage"));
const AdminContactRequestsPage = lazy(() => import("../admin/contact-requests/AdminContactRequestsPage"));
const AdminBusinessesPage = lazy(() => import("../admin/businesses/AdminBusinessesPage"));
const AdminBusinessCategoriesPage = lazy(() => import("../admin/business-categories/AdminBusinessCategoriesPage"));
const AdminDonationSettingsPage = lazy(() => import("../admin/donation/AdminDonationSettingsPage"));
const AdminNavigationPage = lazy(() => import("../admin/navigation/AdminNavigationPage"));
const AdminLoginPage = lazy(() => import("../pages/admin/AdminLoginPage"));

function Wrap({ children }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

export default function AppRouter() {
  return (
    <>
      <ScrollToTop behavior="auto" />
      <Routes>
      <Route element={<RootLayout />}>
        <Route path="__navigation-disabled" element={<NavigationDisabledPage />} />
        <Route
          index
          element={
            <Wrap>
              <HomePage />
            </Wrap>
          }
        />
        <Route
          path="suggestions"
          element={
            <ProtectedRoute>
              <Wrap>
                <SuggestionsPage />
              </Wrap>
            </ProtectedRoute>
          }
        />
       
        <Route
          path="supporters"
          element={
            <Wrap>
              <AllSupportersPage />
            </Wrap>
          }
        />
        <Route
          path="donation"
          element={
            <Wrap>
              <DonationPage />
            </Wrap>
          }
        />
        <Route
          path="login"
          element={
            <Wrap>
              <LoginPage />
            </Wrap>
          }
        />
        <Route
          path="register"
          element={
            <Wrap>
              <RegisterPage />
            </Wrap>
          }
        />
        <Route
          path="profile/my-businesses"
          element={
            <ProtectedRoute>
              <Wrap>
                <MyBusinessesPage />
              </Wrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="Profile/My-Businesses"
          element={
            <ProtectedRoute>
              <Wrap>
                <MyBusinessesPage />
              </Wrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="Register-Business"
          element={
            <ProtectedRoute>
              <Wrap>
                <BusinessRegisterPage />
              </Wrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="Business-Directory"
          element={
            <Wrap>
              <BusinessDirectoryPage />
            </Wrap>
          }
        />
        <Route
          path="business-directory"
          element={
            <Wrap>
              <BusinessDirectoryPage />
            </Wrap>
          }
        />
        <Route
          path="business/category/:id"
          element={
            <Wrap>
              <BusinessCategoryPage />
            </Wrap>
          }
        />
        <Route
          path="Business/category/:id"
          element={
            <Wrap>
              <BusinessCategoryPage />
            </Wrap>
          }
        />
        <Route
          path="Business/:id"
          element={
            <Wrap>
              <BusinessDetailPage />
            </Wrap>
          }
        />
        <Route
          path="business/:id"
          element={
            <Wrap>
              <BusinessDetailPage />
            </Wrap>
          }
        />
        <Route
          path="profile/:username?"
          element={
            <ProtectedRoute>
              <Wrap>
                <ProfilePage />
              </Wrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="me"
          element={
            <ProtectedRoute>
              <Navigate to="/profile" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="account"
          element={
            <ProtectedRoute>
              <Navigate to="/profile" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path=":username"
          element={
            <ProtectedRoute>
              <Wrap>
                <ProfilePage />
              </Wrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="village/:slug?"
          element={
            <Wrap>
              <VillagePage />
            </Wrap>
          }
        />
        <Route
          path="news"
          element={
            <Wrap>
              <NewsListPage />
            </Wrap>
          }
        />
        <Route
          path="news/:slug"
          element={
            <Wrap>
              <NewsDetailPage />
            </Wrap>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <Wrap>
                <SettingsPage />
              </Wrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="search"
          element={
            <Wrap>
              <SearchPage />
            </Wrap>
          }
        />
        <Route
          path="post/new"
          element={
            <ProtectedRoute>
              <Wrap>
                <PostPage />
              </Wrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="post/:postId"
          element={
            <Wrap>
              <PostPage />
            </Wrap>
          }
        />
        <Route
          path="pages/about-us"
          element={
            <Wrap>
              <AboutUsPage />
            </Wrap>
          }
        />
        <Route
          path="pages/community-guidelines"
          element={
            <Wrap>
              <CommunityGuidelinesPage />
            </Wrap>
          }
        />
        <Route
          path="pages/privacy-policy"
          element={
            <Wrap>
              <PrivacyPolicyPage />
            </Wrap>
          }
        />
        <Route
          path="pages/terms-conditions"
          element={
            <Wrap>
              <TermsConditionsPage />
            </Wrap>
          }
        />
        <Route
          path="pages/contact-us"
          element={
            <Wrap>
              <ContactUsPage />
            </Wrap>
          }
        />
        <Route
          path="help-center"
          element={
            <Wrap>
              <HelpCenterPage />
            </Wrap>
          }
        />
        <Route
          path="help-center/:slug"
          element={
            <Wrap>
              <HelpCenterArticlePage />
            </Wrap>
          }
        />
        <Route
          path="pages/:slug"
          element={
            <Wrap>
              <StaticPage />
            </Wrap>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route
          index
          element={
            <Wrap>
              <AdminDashboardPage />
            </Wrap>
          }
        />
        <Route
          path="users"
          element={
            <Wrap>
              <AdminUsersPage />
            </Wrap>
          }
        />
        <Route
          path="deleted-users"
          element={
            <Wrap>
              <AdminDeletedUsersPage />
            </Wrap>
          }
        />
        <Route
          path="posts"
          element={
            <Wrap>
              <AdminPostsPage />
            </Wrap>
          }
        />
        <Route
          path="polls"
          element={
            <Wrap>
              <AdminPollsPage />
            </Wrap>
          }
        />
        <Route
          path="villages"
          element={
            <Wrap>
              <AdminVillagesPage />
            </Wrap>
          }
        />
        <Route
          path="business-categories"
          element={
            <Wrap>
              <AdminBusinessCategoriesPage />
            </Wrap>
          }
        />
        <Route
          path="reports"
          element={
            <Wrap>
              <AdminReportsPage />
            </Wrap>
          }
        />
        <Route
          path="post-reports"
          element={
            <Wrap>
              <AdminReportsPage mode="posts" />
            </Wrap>
          }
        />
        <Route
          path="user-reports"
          element={
            <Wrap>
              <AdminReportsPage mode="users" />
            </Wrap>
          }
        />
        <Route
          path="blue-ticks"
          element={
            <Wrap>
              <AdminBlueTicksPage />
            </Wrap>
          }
        />
        <Route
          path="settings"
          element={
            <Wrap>
              <AdminSettingsPage />
            </Wrap>
          }
        />
        <Route
          path="navigation"
          element={
            <Wrap>
              <AdminNavigationPage />
            </Wrap>
          }
        />
        <Route
          path="cms"
          element={
            <Wrap>
              <AdminCmsPage />
            </Wrap>
          }
        />
        <Route
          path="donation-settings"
          element={
            <Wrap>
              <AdminDonationSettingsPage />
            </Wrap>
          }
        />
        <Route
          path="news"
          element={
            <Wrap>
              <AdminNewsPage />
            </Wrap>
          }
        />
        <Route
          path="help-center"
          element={
            <Wrap>
              <AdminHelpCenterPage />
            </Wrap>
          }
        />
        <Route
          path="contact-requests"
          element={
            <Wrap>
              <AdminContactRequestsPage />
            </Wrap>
          }
        />
       
        
        <Route
          path="business-directory"
          element={
            <Wrap>
              <AdminBusinessesPage />
            </Wrap>
          }
        />
      </Route>

      <Route
        path="/admin/login"
        element={
          <Wrap>
            <AdminLoginPage />
          </Wrap>
        }
      />
    </Routes>
    </>
  );
}
