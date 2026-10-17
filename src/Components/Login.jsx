import { useAuth } from "react-oidc-context";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/Components/ui/card";

function Login() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex justify-center py-12">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <h1 className="m-0 py-2 text-headline-md text-card-foreground">Welcome to Reviser App</h1>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            className="w-full"
            aria-busy={loading || undefined}
            onClick={() => {
              setLoading(true);
              auth.signinRedirect();
            }}
          >
            {loading ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                <span className="sr-only">Signing in...</span>
              </>
            ) : (
              "Login"
            )}
          </Button>
        </CardContent>
        <CardFooter className="justify-center text-body-sm text-muted-foreground">App by Rjnishant</CardFooter>
      </Card>
    </div>
  );
}

export default Login;
