"use client";

import React from "react";
import { PublicNotice, usePublicNotices } from "@/hooks/usePublicNotices";
import { useRole } from "@/contexts/RoleContext";

export function PublicNoticesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useRole();
  const { getVisibleNotices, dismissNotice } = usePublicNotices(user?.role);

  const visibleNotices = getVisibleNotices();

  if (visibleNotices.length === 0) return <>{children}</>;

  return (
    <>
      {children}
      <div className="fixed top-0 left-0 right-0 z-50 p-3 md:p-4 space-y-2 pointer-events-none">
        <div className="max-w-3xl mx-auto space-y-2 pointer-events-auto">
          {visibleNotices.map((notice) => (
            <PublicNotice
              key={notice.id}
              notice={notice}
              onDismiss={() => dismissNotice(notice.id)}
              showClose={notice.isDismissible}
            />
          ))}
        </div>
      </div>
    </>
  );
}
