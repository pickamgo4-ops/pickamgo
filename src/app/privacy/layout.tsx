import type { Metadata } from "next";
import PrivacyPage from "./page";

export const metadata: Metadata = {
  title: "Privacy Policy — PickAmGo",
  description:
    "Read the PickAmGo privacy policy. Learn how we protect your data and privacy when you use our online marketplace.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
