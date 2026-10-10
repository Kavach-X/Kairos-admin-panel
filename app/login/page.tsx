import { redirect } from "next/navigation";
import { verifyAdminAccess } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Kairos Admin Console",
  description: "Sign in to the Kairos Edge Platform administration panel",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const adminContext = await verifyAdminAccess();
  console.log("adminContext", adminContext);
  if (adminContext) {
    redirect("/dashboard");
  }

  const resolvedParams = searchParams ? await searchParams : {};

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
      {/* Subtle background gradient for depth */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-40 dark:opacity-20">
        <div className="size-[500px] rounded-full bg-radial from-foreground/5 to-transparent blur-3xl" />
      </div>

      <div className="relative w-full max-w-[380px]">
        {/* Minimalist Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Kairos
          </h1>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            Admin Panel
          </p>
          <p className="mt-2.5 text-xs text-muted-foreground/80">
            Sign in to manage edge boxes, telemetry and partners
          </p>
        </div>

        {/* Login Form */}
        <LoginForm initialError={resolvedParams.error} />

        {/* Footer */}
        <div className="mt-6 flex flex-col items-center gap-1 text-center">
          <p className="text-[11px] text-muted-foreground/80">
            Protected by Kairos Edge Hardware Security Module
          </p>
          <p className="text-[10px] text-muted-foreground/60 font-mono">
            Restricted access • SuperAdmin role required
          </p>
        </div>
      </div>
    </main>
  );
}
