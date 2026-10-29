import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Layout/Navbar";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import { isLoggedIn } from "./utils/auth";
import IdleTimeoutHandler from "./components/Layout/IdleTimeoutHandler";
import AskFinTrackHost from "./components/Layout/AskFinTrackHost";
import OfflineSyncBanner from "./components/Common/OfflineSyncBanner";

// Route-level code splitting to cut initial bundle size by >50%
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const DebtsPage = lazy(() => import("./pages/DebtsPage"));
const SavingsPage = lazy(() => import("./pages/SavingsPage"));
const CreditCardPage = lazy(() => import("./pages/CreditCardPage"));
const LedgerPage = lazy(() => import("./pages/LedgerPage"));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const QuickAddPage = lazy(() => import("./pages/QuickAddPage"));
const TrashPage = lazy(() => import("./pages/TrashPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const RulesPage = lazy(() => import("./pages/RulesPage"));
const WidgetsPage = lazy(() => import("./pages/WidgetsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));

const PageFallback = () => (
  <div className="bg-zinc-950 min-h-[70vh] flex items-center justify-center text-zinc-500 text-xs font-medium tracking-wide">
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-ping" />
      <span>Loading...</span>
    </div>
  </div>
);

function AppLayout() {
  useLocation(); // Re-evaluate auth status on route changes
  const loggedIn = isLoggedIn();

  return (
    <>
      <IdleTimeoutHandler />
      <div className="bg-zinc-950 text-zinc-100 min-h-screen pb-20 md:pb-0">
        {loggedIn && <Navbar />}
        {loggedIn && <OfflineSyncBanner />}
        {loggedIn && <AskFinTrackHost />}
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debts"
              element={
                <ProtectedRoute>
                  <DebtsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/savings"
              element={
                <ProtectedRoute>
                  <SavingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/credit-cards"
              element={
                <ProtectedRoute>
                  <CreditCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <ProtectedRoute>
                  <SubscriptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ledger"
              element={
                <ProtectedRoute>
                  <LedgerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trash"
              element={
                <ProtectedRoute>
                  <TrashPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/import"
              element={
                <ProtectedRoute>
                  <ImportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/review"
              element={
                <ProtectedRoute>
                  <ReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rules"
              element={
                <ProtectedRoute>
                  <RulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/widgets"
              element={
                <ProtectedRoute>
                  <WidgetsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quick"
              element={
                <ProtectedRoute>
                  <QuickAddPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <Toaster
        position="bottom-center"
        containerClassName="fintrack-toaster"
        toastOptions={{ style: { background: "#333", color: "#fff" } }}
      />
      <AppLayout />
    </Router>
  );
}

export default App;
