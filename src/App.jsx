import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Layout/Navbar";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import { isLoggedIn } from "./utils/auth";
import IdleTimeoutHandler from "./components/Layout/IdleTimeoutHandler";

// Route-level code splitting to cut initial bundle size by >50%
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const DebtsPage = lazy(() => import("./pages/DebtsPage"));
const SavingsPage = lazy(() => import("./pages/SavingsPage"));
const CreditCardPage = lazy(() => import("./pages/CreditCardPage"));
const LedgerPage = lazy(() => import("./pages/LedgerPage"));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
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
        toastOptions={{ style: { background: "#333", color: "#fff" } }}
      />
      <AppLayout />
    </Router>
  );
}

export default App;
