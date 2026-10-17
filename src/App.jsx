import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import DebtsPage from "./pages/DebtsPage";
import SavingsPage from "./pages/SavingsPage";
import CreditCardPage from "./pages/CreditCardPage";
import LedgerPage from "./pages/LedgerPage";
import LoginPage from "./pages/LoginPage";
import Navbar from "./components/Layout/Navbar";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import { isLoggedIn } from "./utils/auth";
import IdleTimeoutHandler from "./components/Layout/IdleTimeoutHandler";

function AppLayout() {
  useLocation(); // Re-evaluate auth status on route changes
  const loggedIn = isLoggedIn();

  return (
    <>
      <IdleTimeoutHandler />
      <div className="bg-zinc-950 text-zinc-100 min-h-screen pb-20 md:pb-0">
        {loggedIn && <Navbar />}
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
            path="/ledger"
            element={
              <ProtectedRoute>
                <LedgerPage />
              </ProtectedRoute>
            }
          />
        </Routes>
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
