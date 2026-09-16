export type Language = "bn" | "en";

export const translations = {
  // ─── Common / Navbar ───
  app_name: {
    bn: "Quickpin",
    en: "Quickpin",
  },
  tagline: {
    bn: "আপনার পছন্দের পণ্য, এক ক্লিকেই",
    en: "Your favorite products, just one click",
  },
  select_language: {
    bn: "ভাষা নির্বাচন করুন",
    en: "Select Language",
  },
  bn_lang: {
    bn: "🇧🇩 বাংলা",
    en: "🇧🇩 Bengali",
  },
  en_lang: {
    bn: "🇬🇧 ইংরেজি",
    en: "🇬🇧 English",
  },

  // ─── Home ───
  home: {
    bn: "হোম",
    en: "Home",
  },
  categories: {
    bn: "ক্যাটাগরি",
    en: "Categories",
  },
  products: {
    bn: "পণ্য",
    en: "Products",
  },
  all_products: {
    bn: "সব পণ্য",
    en: "All Products",
  },
  view_all: {
    bn: "সব দেখুন",
    en: "View All",
  },
  loading: {
    bn: "লোড হচ্ছে...",
    en: "Loading...",
  },
  no_products: {
    bn: "কোনো পণ্য পাওয়া যায়নি",
    en: "No products found",
  },

  // ─── Product ───
  add_to_cart: {
    bn: "কার্টে যোগ করুন",
    en: "Add to Cart",
  },
  out_of_stock: {
    bn: "স্টক নেই",
    en: "Out of Stock",
  },
  price: {
    bn: "দাম",
    en: "Price",
  },
  weight: {
    bn: "ওজন",
    en: "Weight",
  },
  description: {
    bn: "বিবরণ",
    en: "Description",
  },

  // ─── Profile Dropdown ───
  my_cart: {
    bn: "আমার কার্ট",
    en: "My Cart",
  },
  my_orders: {
    bn: "আমার অর্ডার",
    en: "My Orders",
  },
  my_addresses: {
    bn: "আমার ঠিকানা",
    en: "My Addresses",
  },
  logout: {
    bn: "লগ আউট",
    en: "Logout",
  },
  sign_in: {
    bn: "সাইন ইন করুন",
    en: "Sign In",
  },
  sign_in_with_google: {
    bn: "Google দিয়ে সাইন ইন করুন",
    en: "Sign in with Google",
  },

  // ─── Cart ───
  cart: {
    bn: "কার্ট",
    en: "Cart",
  },
  cart_empty: {
    bn: "আপনার কার্ট খালি",
    en: "Your cart is empty",
  },
  quantity: {
    bn: "পরিমাণ",
    en: "Quantity",
  },
  total: {
    bn: "মোট",
    en: "Total",
  },
  subtotal: {
    bn: "সাবটোটাল",
    en: "Subtotal",
  },
  checkout: {
    bn: "চেকআউট",
    en: "Checkout",
  },
  min_units_msg: {
    bn: "চেকআউট করতে কমপক্ষে ১০ ইউনিট প্রয়োজন। আপনার আছে {count} ইউনিট।",
    en: "Minimum 10 units required to checkout. You have {count} units.",
  },
  min_units_short: {
    bn: "১০ ইউনিট পূরণ হয়নি",
    en: "10 units not complete",
  },

  // ─── Delivery ───
  delivery_option: {
    bn: "ডেলিভারি অপশন",
    en: "Delivery Option",
  },
  self_pickup: {
    bn: "নিজে সংগ্রহ",
    en: "Self Pickup",
  },
  home_delivery: {
    bn: "হোম ডেলিভারি",
    en: "Home Delivery",
  },
  free: {
    bn: "ফ্রি",
    en: "Free",
  },
  delivery_charge: {
    bn: "ডেলিভারি চার্জ",
    en: "Delivery Charge",
  },

  // ─── Payment Type ───
  payment_type: {
    bn: "পেমেন্ট ধরন",
    en: "Payment Type",
  },
  full_payment: {
    bn: "সম্পূর্ণ পেমেন্ট",
    en: "Full Payment",
  },
  partial_payment: {
    bn: "আংশিক পেমেন্ট",
    en: "Partial Payment",
  },
  paid_now: {
    bn: "এখন দিতে হবে",
    en: "Pay Now",
  },
  pay_later: {
    bn: "পরে দিতে হবে",
    en: "Pay Later",
  },

  // ─── Payment ───
  pay_now: {
    bn: "এখনই পেমেন্ট করুন",
    en: "Pay Now",
  },
  qr_code: {
    bn: "QR কোড স্ক্যান করুন",
    en: "Scan QR Code",
  },
  upload_screenshot: {
    bn: "স্ক্রিনশট আপলোড করুন",
    en: "Upload Screenshot",
  },
  payment_verifying: {
    bn: "পেমেন্ট যাচাই হচ্ছে...",
    en: "Verifying payment...",
  },
  payment_success: {
    bn: "পেমেন্ট সফল হয়েছে",
    en: "Payment Successful",
  },

  // ─── Orders ───
  order_number: {
    bn: "অর্ডার নম্বর",
    en: "Order Number",
  },
  order_status: {
    bn: "অর্ডার স্ট্যাটাস",
    en: "Order Status",
  },
  order_date: {
    bn: "অর্ডার তারিখ",
    en: "Order Date",
  },
  pending: {
    bn: "অপেক্ষমাণ",
    en: "Pending",
  },
  current: {
    bn: "চলমান",
    en: "Current",
  },
  out_for_delivery: {
    bn: "ডেলিভারির পথে",
    en: "Out for Delivery",
  },
  delivered: {
    bn: "ডেলিভার হয়েছে",
    en: "Delivered",
  },
  refund: {
    bn: "ফেরত",
    en: "Refund",
  },
  spam: {
    bn: "স্প্যাম",
    en: "Spam",
  },

  // ─── Address ───
  add_new_address: {
    bn: "নতুন ঠিকানা যোগ করুন",
    en: "Add New Address",
  },
  full_name: {
    bn: "পুরো নাম",
    en: "Full Name",
  },
  phone: {
    bn: "ফোন নম্বর",
    en: "Phone",
  },
  address: {
    bn: "ঠিকানা",
    en: "Address",
  },
  city: {
    bn: "শহর",
    en: "City",
  },
  state: {
    bn: "রাজ্য",
    en: "State",
  },
  pincode: {
    bn: "পিনকোড",
    en: "Pincode",
  },
  save: {
    bn: "সংরক্ষণ করুন",
    en: "Save",
  },
  cancel: {
    bn: "বাতিল",
    en: "Cancel",
  },
  edit: {
    bn: "সম্পাদনা",
    en: "Edit",
  },
  delete: {
    bn: "মুছুন",
    en: "Delete",
  },

  // ─── Footer ───
  copyright: {
    bn: "© 2026 কুইকপিন। সর্বস্বত্ব সংরক্ষিত।",
    en: "© 2026 Quickpin. All rights reserved.",
  },
} as const;

export type TranslationKey = keyof typeof translations;

// ─── Translation function ───
export function t(
  key: TranslationKey,
  lang: Language = "en",
  vars?: Record<string, string | number>
): string {
  const entry = translations[key];
  if (!entry) return key;

  let text: string = entry[lang] || entry.en || key;

  // Replace {count}, {name} type variables
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    });
  }

  return text;
    }
