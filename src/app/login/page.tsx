import { Suspense } from "react";
import AuthPage from "@/components/AuthPage";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-snow" />}>
      <AuthPage mode="login" />
    </Suspense>
  );
}
