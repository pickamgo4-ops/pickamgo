"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";

export type NoticeType =
  | "INFORMATION"
  | "SUCCESS"
  | "WARNING"
  | "IMPORTANT"
  | "MAINTENANCE"
  | "PROMOTION"
  | "UPDATE"
  | "CUSTOM";

export interface PublicNotice {
  id: string;
  title: string;
  message: string;
  type: NoticeType;
  icon?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  linkTarget?: "_self" | "_blank";
  pageTargets: string[];
  audience: string;
  priority: number;
  isDismissible: boolean;
  rememberDismissal: boolean;
  reappearAfterHours?: number;
  status: string;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
}

interface DismissalRecord {
  noticeId: string;
  dismissedAt: string;
}

const TYPE_STYLES: Record<
  NoticeType,
  { bg: string; border: string; text: string; iconBg: string }
> = {
  INFORMATION: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-900",
    iconBg: "bg-blue-100",
  },
  SUCCESS: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-900",
    iconBg: "bg-green-100",
  },
  WARNING: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-900",
    iconBg: "bg-yellow-100",
  },
  IMPORTANT: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-900",
    iconBg: "bg-red-100",
  },
  MAINTENANCE: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-900",
    iconBg: "bg-purple-100",
  },
  PROMOTION: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-900",
    iconBg: "bg-pink-100",
  },
  UPDATE: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-900",
    iconBg: "bg-indigo-100",
  },
  CUSTOM: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-900",
    iconBg: "bg-gray-100",
  },
};

function getCurrentPage(): string {
  if (typeof window === "undefined") return "ALL";
  const path = window.location.pathname;
  if (path === "/" || path === "/discover") return "HOME";
  if (path.startsWith("/search")) return "SEARCH";
  if (path.startsWith("/category")) return "CATEGORY";
  if (path.startsWith("/product/")) return "PRODUCT";
  if (path.startsWith("/shop/")) return "SHOP";
  if (path === "/cart") return "CART";
  if (path.startsWith("/checkout")) return "CHECKOUT";
  if (path.startsWith("/orders")) return "ORDERS";
  if (path.startsWith("/bookings")) return "BOOKINGS";
  if (path.startsWith("/seller")) return "SELLER";
  if (path.startsWith("/rider")) return "RIDER";
  if (path.startsWith("/profile") || path.startsWith("/settings") || path.startsWith("/addresses"))
    return "ACCOUNT";
  if (path.startsWith("/auth")) return "AUTH";
  if (path.startsWith("/track")) return "TRACK";
  if (path.startsWith("/messages")) return "MESSAGES";
  if (path.startsWith("/report")) return "REPORT";
  if (path.startsWith("/help")) return "HELP";
  if (path.startsWith("/security")) return "SECURITY";
  if (path === "/privacy") return "PRIVACY";
  if (path === "/terms") return "TERMS";
  return "ALL";
}

function matchesPageTarget(noticePageTargets: string[], currentPage: string): boolean {
  if (noticePageTargets.includes("ALL")) return true;
  return noticePageTargets.includes(currentPage);
}

function matchesAudience(noticeAudience: string, userRole?: string): boolean {
  if (noticeAudience === "EVERYONE") return true;
  if (noticeAudience === "GUESTS") return !userRole;
  if (userRole) {
    if (noticeAudience === "BUYERS" && userRole === "buyer") return true;
    if (noticeAudience === "SELLERS" && userRole === "seller") return true;
    if (noticeAudience === "RIDERS" && userRole === "rider") return true;
    if (noticeAudience === "ADMINS" && userRole === "admin") return true;
  }
  return false;
}

function isNoticeActive(notice: PublicNotice): boolean {
  const now = new Date();
  if (notice.status !== "PUBLISHED") return false;
  if (notice.startsAt && new Date(notice.startsAt) > now) return false;
  if (notice.endsAt && new Date(notice.endsAt) < now) return false;
  return true;
}

function isDismissed(notice: PublicNotice, dismissals: DismissalRecord[]): boolean {
  const dismissal = dismissals.find((d) => d.noticeId === notice.id);
  if (!dismissal) return false;
  if (!notice.rememberDismissal) return false;
  if (notice.reappearAfterHours && notice.reappearAfterHours > 0) {
    const dismissedAt = new Date(dismissal.dismissedAt);
    const reappearAt = new Date(dismissedAt.getTime() + notice.reappearAfterHours * 60 * 60 * 1000);
    if (reappearAt > new Date()) return true;
    return false;
  }
  return true;
}

export function usePublicNotices(userRole?: string) {
  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dismissals, setDismissals] = useState<DismissalRecord[]>([]);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<{ notices: PublicNotice[] }>("/public-notices/public");
      if (response.success && response.data) {
        setNotices(response.data.notices);
      } else {
        setError(response.error || "Unable to load public notices");
      }
    } catch {
      setError("Unable to load public notices");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDismissals = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;
      const response = await api.get<{ dismissals: DismissalRecord[] }>(
        "/public-notices/dismissals",
      );
      if (response.success && response.data) {
        setDismissals(response.data.dismissals);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadNotices();
    loadDismissals();
  }, [loadNotices, loadDismissals]);

  const dismissNotice = useCallback(async (noticeId: string) => {
    try {
      await api.post(`/public-notices/${noticeId}/dismiss`, {});
      setDismissals((prev) => [...prev, { noticeId, dismissedAt: new Date().toISOString() }]);
    } catch {
      // ignore
    }
  }, []);

  const getVisibleNotices = useCallback(
    (page?: string): PublicNotice[] => {
      const currentPage = page || getCurrentPage();
      return notices
        .filter((notice) => isNoticeActive(notice))
        .filter((notice) => matchesPageTarget(notice.pageTargets, currentPage))
        .filter((notice) => matchesAudience(notice.audience, userRole))
        .filter((notice) => !isDismissed(notice, dismissals))
        .sort(
          (a, b) =>
            b.priority - a.priority ||
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
    },
    [notices, dismissals, userRole],
  );

  return {
    notices,
    loading,
    error,
    dismissals,
    dismissNotice,
    getVisibleNotices,
    refreshNotices: loadNotices,
  };
}

export function PublicNotice({
  notice,
  onDismiss,
  showClose = true,
}: {
  notice: PublicNotice;
  onDismiss?: () => void;
  showClose?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

  if (!isVisible) return null;

  const styles = TYPE_STYLES[notice.type] || TYPE_STYLES.INFORMATION;
  const icon =
    notice.icon ||
    (notice.type === "WARNING"
      ? "⚠️"
      : notice.type === "IMPORTANT"
        ? "🔴"
        : notice.type === "SUCCESS"
          ? "✅"
          : notice.type === "MAINTENANCE"
            ? "🔧"
            : notice.type === "PROMOTION"
              ? "🎉"
              : "ℹ️");

  const handleDismiss = async () => {
    if (!notice.isDismissible) return;
    setIsDismissing(true);
    if (onDismiss) {
      await onDismiss();
    }
    setIsVisible(false);
  };

  return (
    <div
      className={`relative w-full rounded-xl border-2 p-4 transition-all duration-300 ${styles.bg} ${styles.border} ${isDismissing ? "opacity-0 translate-y-[-8px]" : "opacity-100 translate-y-0"}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center text-lg`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm ${styles.text}`}>{notice.title}</h4>
          <p className={`text-xs mt-1 ${styles.text} opacity-80 whitespace-pre-wrap`}>
            {notice.message}
          </p>
          {notice.buttonText && notice.buttonUrl && (
            <a
              href={notice.buttonUrl}
              target={notice.linkTarget === "_blank" ? "_blank" : undefined}
              rel={notice.linkTarget === "_blank" ? "noopener noreferrer" : undefined}
              className={`inline-flex items-center mt-3 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${styles.iconBg} ${styles.text} hover:opacity-80`}
            >
              {notice.buttonText}
            </a>
          )}
        </div>
        {showClose && notice.isDismissible && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${styles.iconBg} ${styles.text} hover:opacity-70 transition-opacity`}
            aria-label="Dismiss notice"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
