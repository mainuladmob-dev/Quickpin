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

      // ইউজার লগইন না থাকলে সরাসরি এডমিন লগইন পেজে পাঠানো
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      // যদি রোল এডমিন, সুপার এডমিন বা স্টাফ হয় -> ড্যাশবোর্ডে পাঠানো
      if (
        profile &&
        ["admin", "super_admin", "staff"].includes(profile.role)
      ) {
        router.replace("/admin/dashboard");
        return;
      }

      // সাধারণ কাস্টমার হলে তাকে লগআউট না করে সুরক্ষিতভাবে হোমপেজে পাঠানো
      router.replace("/home");
    };

    check();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
