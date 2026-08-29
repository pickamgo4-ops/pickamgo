"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useRole } from "@/contexts/RoleContext";
import { api } from "@/lib/api";

type NoticeType =
  | "INFORMATION"
  | "SUCCESS"
  | "WARNING"
  | "IMPORTANT"
  | "MAINTENANCE"
  | "PROMOTION"
  | "UPDATE"
  | "CUSTOM";
type NoticeStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "EXPIRED" | "ARCHIVED";

const noticeTypes: NoticeType[] = [
  "INFORMATION",
  "SUCCESS",
  "WARNING",
  "IMPORTANT",
  "MAINTENANCE",
  "PROMOTION",
  "UPDATE",
  "CUSTOM",
];
const pageTargets = [
  { value: "ALL", label: "All Pages" },
  { value: "HOME", label: "Home" },
  { value: "SEARCH", label: "Search" },
  { value: "CATEGORY", label: "Category Pages" },
  { value: "PRODUCT", label: "Product Pages" },
  { value: "SHOP", label: "Shop Pages" },
  { value: "CART", label: "Cart" },
  { value: "CHECKOUT", label: "Checkout" },
  { value: "ORDERS", label: "Orders" },
  { value: "BOOKINGS", label: "Bookings" },
  { value: "SELLER", label: "Seller Pages" },
  { value: "RIDER", label: "Rider Pages" },
  { value: "ACCOUNT", label: "Account/Profile" },
  { value: "AUTH", label: "Login/Register" },
  { value: "DISCOVER", label: "Discover" },
  { value: "TRACK", label: "Track Order" },
  { value: "MESSAGES", label: "Messages" },
  { value: "REPORT", label: "Report" },
  { value: "SETTINGS", label: "Settings" },
  { value: "HELP", label: "Help" },
  { value: "SECURITY", label: "Security" },
  { value: "PRIVACY", label: "Privacy" },
  { value: "TERMS", label: "Terms" },
];

const audiences = [
  { value: "EVERYONE", label: "Everyone" },
  { value: "BUYERS", label: "Buyers" },
  { value: "SELLERS", label: "Sellers" },
  { value: "RIDERS", label: "Riders" },
  { value: "ADMINS", label: "Admins" },
  { value: "GUESTS", label: "Guests" },
];

const typeIcons: Record<NoticeType, string> = {
  INFORMATION: "ℹ️",
  SUCCESS: "✅",
  WARNING: "⚠️",
  IMPORTANT: "🔴",
  MAINTENANCE: "🔧",
  PROMOTION: "🎉",
  UPDATE: "📢",
  CUSTOM: "📌",
};

function EditForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading, authInitialized } = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "INFORMATION" as NoticeType,
    icon: "",
    imageUrl: "",
    buttonText: "",
    buttonUrl: "",
    linkTarget: "_self" as "_self" | "_blank",
    pageTargets: ["ALL"] as string[],
    audience: "EVERYONE" as string,
    priority: 0,
    status: "DRAFT" as NoticeStatus,
    isDismissible: true,
    rememberDismissal: true,
    reappearAfterHours: 24,
    startsAt: "",
    endsAt: "",
    showCTA: false,
    scheduleEnabled: false,
    showAllPages: true,
  });

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user?.isAdmin) {
      router.push("/");
      return;
    }
    loadNotice();
  }, [authInitialized, authLoading, user, router, id]);

  const loadNotice = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ notice: any }>(`/public-notices/${id}`);
      if (response.success && response.data) {
        const notice = response.data.notice;
        setForm({
          title: notice.title,
          message: notice.message,
          type: notice.type,
          icon: notice.icon || "",
          imageUrl: notice.imageUrl || "",
          buttonText: notice.buttonText || "",
          buttonUrl: notice.buttonUrl || "",
          linkTarget: notice.linkTarget || "_self",
          pageTargets: notice.pageTargets || ["ALL"],
          audience: notice.audience || "EVERYONE",
          priority: notice.priority || 0,
          status: notice.status || "DRAFT",
          isDismissible: notice.isDismissible ?? true,
          rememberDismissal: notice.rememberDismissal ?? true,
          reappearAfterHours: notice.reappearAfterHours || 24,
          startsAt: notice.startsAt ? notice.startsAt.slice(0, 16) : "",
          endsAt: notice.endsAt ? notice.endsAt.slice(0, 16) : "",
          showCTA: !!(notice.buttonText && notice.buttonUrl),
          scheduleEnabled: !!(notice.startsAt || notice.endsAt),
          showAllPages:
            (notice.pageTargets || []).length === 1 &&
            notice.pageTargets?.[0] === "ALL",
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePageTarget = (target: string) => {
    setForm((prev) => {
      if (target === "ALL") {
        return { ...prev, pageTargets: ["ALL"], showAllPages: true };
      }
      const filtered = prev.pageTargets.filter((t) => t !== "ALL");
      if (filtered.includes(target)) {
        const next = filtered.filter((t) => t !== target);
        return { ...prev, pageTargets: next, showAllPages: next.length === 0 };
      }
      return { ...prev, pageTargets: [...filtered, target], showAllPages: false };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        pageTargets: form.pageTargets,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        reappearAfterHours: form.reappearAfterHours,
      };
      const response = await api.patch(`/public-notices/${id}`, payload);
      if (response.success) {
        router.push("/admin/public-notices");
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/public-notices/${id}/publish`, {});
      router.push("/admin/public-notices");
    } catch {
      // ignore
    }
  };

  if (authLoading || !authInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-warm-800/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) return null;

  const previewNotice = {
    title: form.title || "Notice Title",
    message: form.message || "Notice message will appear here...",
    type: form.type,
    icon: form.icon || typeIcons[form.type],
    buttonText: form.buttonText,
    buttonUrl: form.buttonUrl,
    isDismissible: form.isDismissible,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 md:ml-64 overflow-y-auto">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-warm-200 px-4 py-3 md:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="font-semibold text-warm-900">Edit Public Notice</h1>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" onClick={() => router.back()} className="hidden md:flex">
                <ArrowLeft size={18} />
              </Button>
              <div>
                <h1 className="font-display text-3xl font-bold text-warm-900">Edit Public Notice</h1>
                <p className="text-warm-800/60 mt-1">Update notice content, targeting, and settings</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="font-semibold text-warm-900 mb-4">Content</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-warm-900 mb-1">Title *</label>
                        <Input value={form.title} onValueChange={(v) => updateField("title", v)} placeholder="Notice title" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warm-900 mb-1">Message *</label>
                        <textarea
                          value={form.message}
                          onChange={(e) => updateField("message", e.target.value)}
                          placeholder="Notice content..."
                          rows={5}
                          className="w-full rounded-xl border border-warm-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-warm-900 mb-1">Type</label>
                          <select value={form.type} onChange={(e) => updateField("type", e.target.value)} className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm">
                            {noticeTypes.map((type) => (
                              <option key={type} value={type}>
                                {typeIcons[type]} {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-warm-900 mb-1">Priority</label>
                          <Input type="number" value={String(form.priority)} onValueChange={(v) => updateField("priority", parseInt(v) || 0)} min={0} max={100} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warm-900 mb-1">Custom Icon (emoji or URL)</label>
                        <Input value={form.icon} onValueChange={(v) => updateField("icon", v)} placeholder="e.g. 🔧 or https://..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warm-900 mb-1">Image URL</label>
                        <Input value={form.imageUrl} onValueChange={(v) => updateField("imageUrl", v)} placeholder="https://..." />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-semibold text-warm-900 mb-4">Call to Action</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="showCTA" checked={form.showCTA} onChange={(e) => updateField("showCTA", e.target.checked)} className="rounded border-warm-300" />
                        <label htmlFor="showCTA" className="text-sm text-warm-900">Show CTA button</label>
                      </div>
                      {form.showCTA && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-warm-900 mb-1">Button Text</label>
                            <Input value={form.buttonText} onValueChange={(v) => updateField("buttonText", v)} placeholder="Learn More" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-warm-900 mb-1">Button URL</label>
                            <Input value={form.buttonUrl} onValueChange={(v) => updateField("buttonUrl", v)} placeholder="https://pickamgo.com/..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-warm-900 mb-1">Link Target</label>
                            <select value={form.linkTarget} onChange={(e) => updateField("linkTarget", e.target.value)} className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm">
                              <option value="_self">Same Tab</option>
                              <option value="_blank">New Tab</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-semibold text-warm-900 mb-4">Page Targeting</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="showAllPages" checked={form.showAllPages} onChange={(e) => updateField("showAllPages", e.target.checked)} className="rounded border-warm-300" />
                        <label htmlFor="showAllPages" className="text-sm text-warm-900">Show on all pages</label>
                      </div>
                      {!form.showAllPages && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {pageTargets.map((target) => (
                            <label key={target.value} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={form.pageTargets.includes(target.value)} onChange={() => togglePageTarget(target.value)} className="rounded border-warm-300" />
                              {target.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-semibold text-warm-900 mb-4">Audience & Scheduling</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-warm-900 mb-1">Audience</label>
                        <select value={form.audience} onChange={(e) => updateField("audience", e.target.value)} className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm">
                          {audiences.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="scheduleEnabled" checked={form.scheduleEnabled} onChange={(e) => updateField("scheduleEnabled", e.target.checked)} className="rounded border-warm-300" />
                        <label htmlFor="scheduleEnabled" className="text-sm text-warm-900">Schedule notice</label>
                      </div>
                      {form.scheduleEnabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-warm-900 mb-1">Start Date</label>
                            <Input type="datetime-local" value={form.startsAt} onValueChange={(v) => updateField("startsAt", v)} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-warm-900 mb-1">End Date</label>
                            <Input type="datetime-local" value={form.endsAt} onValueChange={(v) => updateField("endsAt", v)} />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-warm-900">Settings</h3>
                      <div className="flex rounded-lg border border-warm-200 overflow-hidden">
                        <button type="button" onClick={() => setPreviewMode("desktop")} className={`px-3 py-1.5 text-xs ${previewMode === "desktop" ? "bg-primary text-white" : "bg-white text-warm-800"}`}>
                          <Monitor size={14} className="inline mr-1" /> Desktop
                        </button>
                        <button type="button" onClick={() => setPreviewMode("mobile")} className={`px-3 py-1.5 text-xs ${previewMode === "mobile" ? "bg-primary text-white" : "bg-white text-warm-800"}`}>
                          <Smartphone size={14} className="inline mr-1" /> Mobile
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-warm-900 mb-1">Status</label>
                        <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm">
                          {(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"] as NoticeStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="isDismissible" checked={form.isDismissible} onChange={(e) => updateField("isDismissible", e.target.checked)} className="rounded border-warm-300" />
                        <label htmlFor="isDismissible" className="text-sm text-warm-900">Allow users to dismiss</label>
                      </div>
                      {form.isDismissible && (
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="rememberDismissal" checked={form.rememberDismissal} onChange={(e) => updateField("rememberDismissal", e.target.checked)} className="rounded border-warm-300" />
                          <label htmlFor="rememberDismissal" className="text-sm text-warm-900">Remember dismissal</label>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-warm-900 mb-1">Reappear after (hours)</label>
                        <Input type="number" value={String(form.reappearAfterHours)} onValueChange={(v) => updateField("reappearAfterHours", parseInt(v) || 24)} min={0} />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-semibold text-warm-900 mb-4">Preview</h3>
                    <div className={`mx-auto border border-warm-200 rounded-lg overflow-hidden ${previewMode === "mobile" ? "max-w-sm" : "w-full"}`}>
                      <div className="bg-warm-50 p-3 border-b border-warm-200 flex items-center justify-between">
                        <span className="text-xs font-medium text-warm-800/60">Preview</span>
                        <span className="text-xs text-warm-800/40">{previewMode}</span>
                      </div>
                      <div className="p-4">
                        <div
                          className={`rounded-xl p-4 border-2 ${
                            previewNotice.type === "WARNING"
                              ? "bg-yellow-50 border-yellow-200"
                              : previewNotice.type === "IMPORTANT"
                                ? "bg-red-50 border-red-200"
                                : previewNotice.type === "SUCCESS"
                                  ? "bg-green-50 border-green-200"
                                  : previewNotice.type === "MAINTENANCE"
                                    ? "bg-purple-50 border-purple-200"
                                    : previewNotice.type === "PROMOTION"
                                      ? "bg-pink-50 border-pink-200"
                                      : "bg-blue-50 border-blue-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <span className="text-lg">{previewNotice.icon}</span>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-warm-900 truncate">{previewNotice.title}</h4>
                                <p className="text-xs text-warm-800/70 mt-1 line-clamp-3">{previewNotice.message}</p>
                                {form.showCTA && form.buttonText && <Button size="sm" className="mt-2">{form.buttonText}</Button>}
                              </div>
                            </div>
                            {form.isDismissible && (
                              <button type="button" className="text-warm-800/40 hover:text-warm-800/60">
                                <Eye size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="flex gap-3">
                    <Button type="submit" fullWidth loading={saving} icon={<Save size={18} />}>
                      Save Changes
                    </Button>
                    {form.status !== "PUBLISHED" && (
                      <Button type="button" variant="primary" onClick={handlePublish} className="bg-green-600 hover:bg-green-700 text-white">
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function EditPublicNoticePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-warm-800/60">Loading...</p>
          </div>
        </div>
      }
    >
      <EditForm params={params} />
    </React.Suspense>
  );
}
