import type { Metadata } from "next";
import TermsPage from "./page";

export const metadata: Metadata = {
  title: "Terms of Service — PickAmGo",
  description:
    "Read the PickAmGo terms of service. Learn about your rights and responsibilities when using our general online marketplace.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
