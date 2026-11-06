import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: ('ADMIN' | 'USER')[]; // Optional: to restrict pages to specific roles
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Show a blank screen or spinner while checking localStorage
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // If no user is logged in, redirect them to the Login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If this route requires a specific role and the user doesn't have it, block them
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="flex h-screen items-center justify-center text-red-600">Access Denied: Insufficient Permissions</div>;
  }

  // If they pass all checks, render the child component (the protected page)
  return <Outlet />;
}