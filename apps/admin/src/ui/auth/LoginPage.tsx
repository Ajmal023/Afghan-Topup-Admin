import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import DotGrid from "@/components/DotGrid.tsx"
export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();
    const loc = useLocation();

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post("/auth/login", { email, password });
            
  
            if (response.data.tokens) {
                localStorage.setItem('access_token', response.data.tokens.access);
                localStorage.setItem('refresh_token', response.data.tokens.refresh);
                console.log("Tokens stored successfully");
            }
            
            toast.success("Welcome back");
            const from = (loc.state as any)?.from?.pathname || "/";
            nav(from, { replace: true });
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Login failed");
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[100vh] bg-[#1d1d1d] w-full relative" >
  <DotGrid
    dotSize={7}
    gap={15}
    baseColor="#2b2b2b"
    activeColor="#FFBF00"
    proximity={150}
    shockRadius={250}
    shockStrength={4}
    resistance={750}
    returnDuration={1.5}
  />
        <div className="min-h-screen absolute top-0 left-0 right-0 bottom-0  flex items-center">
            <div className="w-full px-6 flex justify-center lg:px-16 xl:px-20">
                <div className="w-full items-center  lg:w-[40vw] xl:w-[30vw] 2xl:w-[35vw]">
                    <Card className="rounded-2xl border bg-[#1d1d1d]/96 shadow-sm">
                        <div className="p-6 md:p-10">
                            <h1 className="text-center font-bold text-[24px] mb-4 text-amber-500">AFGHAN TOPUP</h1>
                            <h1 className="text-lg font-semibold tracking-tight text-[#fff]">Sign in</h1>
                            <p className="mt-1 text-sm text-[#f9f9f9] ">
                                Access your admin dashboard.
                            </p>

                            <form onSubmit={onSubmit} className="mt-6 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email " className="text-[#fff]">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="border-[#777] text-[#fff]"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="you@company.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-[#f9f9f9]">Password</Label>
                                    <Input
                                        id="password"
                                        className="border-[#777] text-[#fff]"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-neutral-600">
                                        <Link to="#" className="underline text-[#f9f9f9]">Forgot password?</Link>
                                    </div>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? "Signing in…" : "Sign in"}
                                    </Button>
                                </div>
                            </form>

                            {/* <div className="mt-6 text-sm text-neutral-600">
                                Don’t have an account?{" "}
                                <Link to="/signup" className="underline">Create one</Link>
                            </div> */}
                        </div>
                    </Card>
                </div>
            </div>
        </div></div>
    );
}