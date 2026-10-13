import { Suspense } from "react";
import AuthPage from "@/components/AuthPage";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-snow" />}>
      <AuthPage mode="register" />
    </Suspense>
  );
}
