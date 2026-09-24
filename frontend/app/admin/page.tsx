"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminRootPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // ইউজার লগইন না থাকলে সরাসরি এডমিন লগইন পেজে পাঠাবে
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      // যদি রোল এডমিন, সুপার এডমিন বা স্টাফ হয় -> নতুন অল-ইন-ওয়ান অর্ডার হাবে পাঠাবে
      if (
        profile &&
        ["admin", "super_admin", "staff"].includes(profile.role)
      ) {
        router.replace("/admin/orders");
        return;
      }

      // সাধারণ কাস্টমার হলে তাকে কাস্টমার হোমপেজে পাঠাবে
      router.replace("/home");
    };

    check();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="flex items-center gap-3 text-slate-600">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">Redirecting to Live Panel...</p>
      </div>
    </div>
  );
}
