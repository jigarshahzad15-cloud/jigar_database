import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Mail } from "lucide-react";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminLogin() {
  const [email, setEmail] = useState("officiallifechangeeasy@gmail.com");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const loginMutation = trpc.admin.login.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginMutation.mutateAsync({
        email,
        password,
      });

      if (result.success) {
        toast.success("Login successful!");
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Jigar Database</h1>
          <p className="text-muted-foreground">Admin Dashboard Login</p>
        </div>

        {/* Login Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Jigar Team Official © 2025</p>
          <p className="mt-1">Scalable Database System</p>
        </div>
      </div>
    </div>
  );
}
