"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Package,
  ShoppingBag,
  Tag,
  Archive,
  Star,
  MessageSquare,
  Bell,
  Settings,
  HelpCircle,
  FileText,
  MapPin,
  CheckCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Users,
  Eye,
  Flag,
} from "lucide-react";
import { SellerSidebar } from "@/components/SellerSidebar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import { SellerVerification, Order } from "@/types";

interface CheckItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
  status?: string;
}

export default function SellerDashboard() {
  const router = useRouter();
  const { user } = useRole();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sales: 0,
    orders: 0,
    pendingOrders: 0,
    products: 0,
    followers: 0,
    reviews: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 7 });
  const [verification, setVerification] = useState<SellerVerification | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [onboardingRes, ordersRes, productsRes, verificationRes] = await Promise.all([
        api.get<any>("/seller/onboarding"),
        api.get<{ orders: Order[] }>("/seller/orders?limit=5"),
        api.get<{ products: any[] }>("/seller/products"),
        api.get<SellerVerification>("/seller/verification/status"),
      ]);

      if (onboardingRes.success && onboardingRes.data) {
        setChecks(onboardingRes.data.checks || []);
        setProgress(onboardingRes.data.progress || { completed: 0, total: 7 });
      }

      if (ordersRes.success && ordersRes.data) {
        const orders = (ordersRes.data.orders || []).map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber || o.id.slice(-6),
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
          items: o.items || [],
          deliveryAddress: o.deliveryAddress || "",
        }));
        setRecentOrders(orders);
        setStats((prev) => ({
          ...prev,
          orders: (ordersRes.data as any).pagination?.total || orders.length,
          pendingOrders: orders.filter((o: any) =>
            ["PENDING_PAYMENT", "PAID", "CONFIRMED", "PREPARING"].includes(o.status),
          ).length,
          sales: orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
        }));
      }

      if (productsRes.success && productsRes.data) {
        const prods = productsRes.data.products || [];
        setRecentProducts(prods.slice(0, 5));
        setStats((prev) => ({
          ...prev,
          products: (productsRes.data as any).pagination?.total || prods.length,
        }));
      }

      if (verificationRes.success && verificationRes.data) {
        setVerification(
          (verificationRes.data as any).status !== "NOT_SUBMITTED" ? verificationRes.data : null,
        );
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING_PAYMENT: { label: "Pending Payment", color: "bg-yellow-100 text-yellow-700" },
    PAID: { label: "Paid", color: "bg-blue-100 text-blue-700" },
    CONFIRMED: { label: "Confirmed", color: "bg-purple-100 text-purple-700" },
    PREPARING: { label: "Preparing", color: "bg-orange-100 text-orange-700" },
    READY_FOR_PICKUP: { label: "Ready", color: "bg-teal-100 text-teal-700" },
    OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-700" },
    DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
    FAILED: { label: "Failed", color: "bg-red-100 text-red-700" },
  };

  const getCheckStatusBadge = (check: CheckItem) => {
    if (check.done) {
      return (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
          Completed
        </span>
      );
    }
    if (check.status === "PENDING") {
      return (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">
          Pending
        </span>
      );
    }
    if (check.status === "REJECTED") {
      return (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
          Needs attention
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading dashboard...</p>
          </div>
        </div>
      </SellerSidebar>
    );
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="animate-slide-up motion-safe-only">
          <div className="flex items-baseline gap-3 mb-2">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Seller Dashboard
            </h1>
            <p className="text-sm text-primary/70 font-medium hidden md:block">Where Every Pick Finds You</p>
          </div>
          <p className="text-warm-800/60 mt-1">Here's what's happening with your shop today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4 animate-slide-up motion-safe-only stagger-1 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <span className="text-xs text-blue-700 font-medium">Total Sales</span>
            </div>
            <p className="text-xl font-bold text-warm-900">GH₵{stats.sales.toFixed(2)}</p>
            {stats.sales === 0 && <p className="text-[10px] text-warm-800/50 mt-1">No sales yet</p>}
          </Card>
          <Card className="p-4 animate-slide-up motion-safe-only stagger-2 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
              <span className="text-xs text-indigo-700 font-medium">Total Orders</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{stats.orders}</p>
            {stats.orders === 0 && <p className="text-[10px] text-warm-800/50 mt-1">0 orders</p>}
          </Card>
          <Card className="p-4 animate-slide-up motion-safe-only stagger-3 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <Package size={16} />
              </div>
              <span className="text-xs text-amber-700 font-medium">Pending</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{stats.pendingOrders}</p>
          </Card>
          <Card className="p-4 animate-slide-up motion-safe-only stagger-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                <Tag size={16} />
              </div>
              <span className="text-xs text-emerald-700 font-medium">Products</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{stats.products}</p>
          </Card>
          <Card className="p-4 animate-slide-up motion-safe-only stagger-5 bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center">
                <Users size={16} />
              </div>
              <span className="text-xs text-rose-700 font-medium">Followers</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{stats.followers}</p>
          </Card>
          <Card className="p-4 animate-slide-up motion-safe-only stagger-6 bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center">
                <Star size={16} />
              </div>
              <span className="text-xs text-teal-700 font-medium">Reviews</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{stats.reviews}</p>
          </Card>
        </div>

        {/* Get Started Checklist */}
        <Card className="p-6 animate-slide-up motion-safe-only bg-white border-warm-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-warm-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle size={18} />
              </div>
              Get Started Checklist
            </h3>
            <span className="text-sm text-warm-800/60">
              {progress.completed}/{progress.total}
            </span>
          </div>

          <div className="w-full bg-warm-200 rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checks.map((item) => (
              <div
                key={item.key}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                  item.done ? 'bg-warm-100/50' : 'bg-warm-50 hover:bg-warm-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={14} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-warm-800/20 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${item.done ? "text-warm-800/50 line-through" : "text-warm-900 font-medium"}`}
                  >
                    {item.label}
                  </span>
                </div>
                {!item.done && (
                  <button
                    onClick={() => router.push(item.href)}
                    className="text-xs text-primary font-medium hover:text-primary-dark flex items-center gap-1 transition-colors"
                  >
                    Do it <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Verification Status */}
        {verification && (
          <Card className="p-6 animate-slide-up motion-safe-only bg-white border-warm-200">
            <h3 className="font-semibold text-warm-900 mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText size={18} />
              </div>
              Verification Status
            </h3>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  (verification as any).status === "APPROVED"
                    ? "verified"
                    : (verification as any).status === "REJECTED"
                      ? "deal"
                      : "default"
                }
              >
                {(verification as any).status === "APPROVED"
                  ? "Verified"
                  : (verification as any).status === "REJECTED"
                    ? "Rejected"
                    : "Pending Review"}
              </Badge>
            </div>
            {verification.rejectionReason && (
              <p className="text-sm text-red-600 mt-2">{verification.rejectionReason}</p>
            )}
          </Card>
        )}
      </div>
    </SellerSidebar>
  );
}
