"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

const inputClass =
  "h-[52px] w-full rounded-control border border-border-input bg-surface px-4 text-base text-text outline-none focus:border-accent";

export function LoginForm() {
  const [state, dispatch, pending] = useActionState(signIn, null);

  function submit(formData: FormData) {
    formData.set("time_zone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    formData.set("locale", navigator.language);
    dispatch(formData);
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="caps-label text-xs">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state?.email}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="caps-label text-xs">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      {state && (
        <p role="alert" className="text-[15px] text-error-text">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-[52px] rounded-control bg-accent font-condensed text-lg font-bold text-on-accent disabled:opacity-60"
      >
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
