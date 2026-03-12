import { useParams, Navigate } from "react-router-dom";

export default function CompanySlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  
  // Avoid catching known routes
  const reservedPaths = [
    "dashboard", "login", "register-company", "register-success",
    "accept-invite", "pending-approval", "forgot-password", "reset-password",
    "rooms", "restaurant", "bar", "bar-admin", "kitchen", "conference",
    "bookings", "guests", "sales", "tenders", "expenses", "staff",
    "website", "settings", "about", "super-admin"
  ];

  if (!slug || reservedPaths.includes(slug)) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/login/${slug}`} replace />;
}
