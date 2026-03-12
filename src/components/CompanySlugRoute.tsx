import { useParams } from "react-router-dom";
import Login from "@/pages/Login";

export default function CompanySlugRoute() {
  // This component renders the Login page with the slug param,
  // reusing the existing white-label login logic
  return <Login />;
}
