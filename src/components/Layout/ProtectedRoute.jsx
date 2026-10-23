import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "../../utils/auth"; // Corrected path
import { buildLoginPath } from "../../utils/quickAddLink";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  if (!isLoggedIn()) {
    // Come back to this page (e.g. a Quick Add link with ?text=) after logging in
    return <Navigate to={buildLoginPath(location.pathname, location.search)} replace />;
  }
  return children;
};

export default ProtectedRoute;
