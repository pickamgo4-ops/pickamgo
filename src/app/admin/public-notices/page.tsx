"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Megaphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
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

interface PublicNotice {
  id: string;
  title: string;
  message: string;
  type: NoticeType;
  status: NoticeStatus;
  pageTargets: string[];
  audience: string;
  priority: number;
  isDismissible: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
}

const typeColors: Record<NoticeType, string> = {
  INFORMATION: "bg-blue-100 text-blue-800",
  SUCCESS: "bg-green-100 text-green-800",
  WARNING: "bg-yellow-100 text-yellow-800",
  IMPORTANT: "bg-red-100 text-red-800",
  MAINTENANCE: "bg-purple-100 text-purple-800",
  PROMOTION: "bg-pink-100 text-pink-800",
  UPDATE: "bg-indigo-100 text-indigo-800",
  CUSTOM: "bg-gray-100 text-gray-800",
};

const statusColors: Record<NoticeStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  PUBLISHED: "bg-green-100 text-green-800",
  EXPIRED: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
};

export default function PublicNoticesPage() {
  const router = useRouter();
  const { user, loading: authLoading, authInitialized } = useRole();
  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    if (!authInitialized || authLoading) return;
    if (!user?.isAdmin) {
      router.push("/");
      return;
    }
    loadNotices();
  }, [authInitialized, authLoading, user, router]);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      params.set("limit", "50");

      const response = await api.get<{ notices: PublicNotice[] }>(
        `/public-notices?${params.toString()}`,
      );
      if (response.success && response.data) {
        setNotices(response.data.notices);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this public notice?")) return;
    try {
      await api.delete(`/public-notices/${id}`);
      loadNotices();
    } catch {
      // ignore
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/public-notices/${id}/publish`, {});
      loadNotices();
    } catch {
      // ignore
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await api.post(`/public-notices/${id}/unpublish`, {});
      loadNotices();
    } catch {
      // ignore
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.post(`/public-notices/${id}/archive`, {});
      loadNotices();
    } catch {
      // ignore
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await api.get<{ notice: PublicNotice }>(`/public-notices/${id}`);
      if (response.success && response.data) {
        const notice = response.data.notice;
        const createResponse = await api.post(`/public-notices`, {
          ...notice,
          title: `${notice.title} (Copy)`,
          status: "DRAFT",
          pageTargets: notice.pageTargets,
        });
        if (createResponse.success) {
          loadNotices();
        }
      }
    } catch {
      // ignore
    }
  };

  if (authLoading || !authInitialized) {
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

  return (
    <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="font-display text-3xl font-bold text-warm-900">Public Notices</h1>
                <p className="text-warm-800/60 mt-1">
                  Create and manage public notices across the platform
                </p>
              </div>
              <Link href="/admin/public-notices/new">
                <Button icon={<Plus size={18} />}>Create Notice</Button>
              </Link>
            </div>

            <Card className="p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search notices..."
                    value={search}
                    onValueChange={setSearch}
                    icon={<Search size={18} />}
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Types</option>
                  {(
                    [
                      "INFORMATION",
                      "SUCCESS",
                      "WARNING",
                      "IMPORTANT",
                      "MAINTENANCE",
                      "PROMOTION",
                      "UPDATE",
                      "CUSTOM",
                    ] as NoticeType[]
                  ).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Statuses</option>
                  {(
                    ["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"] as NoticeStatus[]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <Button variant="outline" onClick={loadNotices}>
                  Filter
                </Button>
              </div>
            </Card>

            <Card className="overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-warm-800/60">Loading notices...</p>
                </div>
              ) : notices.length === 0 ? (
                <div className="p-8 text-center">
                  <Megaphone size={40} className="mx-auto text-warm-800/30 mb-3" />
                  <p className="text-warm-800/60">No public notices found</p>
                  <Link href="/admin/public-notices/new">
                    <Button className="mt-4" icon={<Plus size={18} />}>
                      Create Your First Notice
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-warm-200 bg-warm-50/50">
                        <th className="px-4 py-3 font-semibold text-warm-900">Title</th>
                        <th className="px-4 py-3 font-semibold text-warm-900">Type</th>
                        <th className="px-4 py-3 font-semibold text-warm-900">Status</th>
                        <th className="px-4 py-3 font-semibold text-warm-900">Pages</th>
                        <th className="px-4 py-3 font-semibold text-warm-900">Starts</th>
                        <th className="px-4 py-3 font-semibold text-warm-900">Ends</th>
                        <th className="px-4 py-3 font-semibold text-warm-900">Priority</th>
                        <th className="px-4 py-3 font-semibold text-warm-900 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-100">
                      {notices.map((notice) => (
                        <tr key={notice.id} className="hover:bg-warm-50/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-warm-900">{notice.title}</div>
                            <div className="text-xs text-warm-800/60 line-clamp-1">
                              {notice.message}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColors[notice.type]}`}
                            >
                              {notice.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[notice.status]}`}
                            >
                              {notice.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-warm-800/70">
                            {notice.pageTargets.length === 1 && notice.pageTargets[0] === "ALL"
                              ? "All Pages"
                              : `${notice.pageTargets.length} pages`}
                          </td>
                          <td className="px-4 py-3 text-warm-800/70">
                            {notice.startsAt ? new Date(notice.startsAt).toLocaleDateString() : "-"}
                          </td>
                          <td className="px-4 py-3 text-warm-800/70">
                            {notice.endsAt
                              ? new Date(notice.endsAt).toLocaleDateString()
                              : "No end"}
                          </td>
                          <td className="px-4 py-3 text-warm-800/70">{notice.priority}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/public-notices/${notice.id}`}>
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </Link>
                              <Link href={`/admin/public-notices/${notice.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                              </Link>
                              {notice.status === "DRAFT" || notice.status === "SCHEDULED" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePublish(notice.id)}
                                >
                                  Publish
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnpublish(notice.id)}
                                >
                                  Unpublish
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchive(notice.id)}
                              >
                                Archive
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicate(notice.id)}
                              >
                                Duplicate
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(notice.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <AlertTriangle size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
    </main>
  );
}
