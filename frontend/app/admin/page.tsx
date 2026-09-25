"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminRootPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (
        profile &&
        ["admin", "super_admin", "staff"].includes(profile.role)
      ) {
        router.replace("/admin/dashboard");
        return;
      }

      router.replace("/home");
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
