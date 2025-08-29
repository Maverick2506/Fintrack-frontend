import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import DebtsPage from "./pages/DebtsPage";
import SavingsPage from "./pages/SavingsPage";
import CreditCardPage from "./pages/CreditCardPage";
import LoginPage from "./pages/LoginPage";
import Navbar from "./components/Layout/Navbar";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import { isLoggedIn } from "./utils/auth";
import IdleTimeoutHandler from "./components/Layout/IdleTimeoutHandler";

function App() {
  const loggedIn = isLoggedIn();

  return (
    <Router>
      <Toaster
        position="bottom-center"
        toastOptions={{ style: { background: "#333", color: "#fff" } }}
      />
      <IdleTimeoutHandler />

      <div className="bg-gray-900 min-h-screen">
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
