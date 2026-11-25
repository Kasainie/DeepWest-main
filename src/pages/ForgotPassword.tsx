import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold font-display">Password reset unavailable</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Email delivery is disabled. Contact your administrator to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
