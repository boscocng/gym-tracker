import { redirect } from "next/navigation";
import { readOwnerSettings } from "@/server/settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await readOwnerSettings()) {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-8 px-4 pt-safe pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="caps-label text-[13px]">Gym Tracker</span>
        <h1 className="font-condensed text-[40px] leading-none font-bold">Sign in</h1>
      </div>
      <LoginForm />
    </main>
  );
}
