"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminRootPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        !profile ||
        !["admin", "super_admin", "staff"].includes(profile.role)
      ) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      router.replace("/admin/dashboard");
    };

    check();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
