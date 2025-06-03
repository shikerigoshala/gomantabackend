import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { USER_ROLES } from '../../services/authService';

/**
 * ProtectedRoute component that checks for authentication and role-based access
 * @param {Object} props - Component props
 * @param {string} [props.redirectTo] - Path to redirect to if not authenticated
 * @param {string} [props.requiredRole] - Required role to access the route
 * @param {React.ReactNode} [props.children] - Child components
 * @returns {React.ReactNode} - Rendered component or redirect
 */
const ProtectedRoute = ({
  redirectTo = '/login',
  requiredRole,
  children,
  ...rest
}) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: window.location.pathname }} />;
  }

  // If role is required but user doesn't have it, redirect to home
  if (requiredRole && !hasRole(requiredRole)) {
    // Special case: If family member tries to access family head routes, redirect to their dashboard
    if (requiredRole === USER_ROLES.FAMILY_HEAD && hasRole(USER_ROLES.FAMILY_MEMBER)) {
      return <Navigate to="/family/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // If using the component as a wrapper (with children)
  // or as a route with nested routes (with Outlet)
  return children || <Outlet {...rest} />;
};

export default ProtectedRoute;
