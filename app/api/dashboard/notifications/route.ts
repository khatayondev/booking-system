import { getCurrentSession } from "@/lib/auth";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";
import { prisma } from "@/lib/db";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "Yesterday" : `${diffDays} days ago`;
}

export const GET = withErrorHandler(async () => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  const userId = session.userId;

  const dbNotifications = await prisma.inAppNotification.findMany({
    where: {
      OR: [{ userId }, { userId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const notifications = dbNotifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    time: formatRelativeTime(n.createdAt),
    type: n.type.toLowerCase(),
    unread: !n.read,
    link: n.link,
    bookingId: n.bookingId,
  }));

  const unreadCount = dbNotifications.filter((n) => !n.read).length;

  return successResponse({
    notifications,
    unreadCount,
  });
});

export const PATCH = withErrorHandler(async (req: Request) => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  const userId = session.userId;
  const body = await req.json().catch(() => ({}));

  if (body.markAllAsRead) {
    await prisma.inAppNotification.updateMany({
      where: {
        read: false,
        OR: [{ userId }, { userId: null }],
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return successResponse<{ success: boolean; markedAll?: boolean; updatedId?: string }>({
      success: true,
      markedAll: true,
    });
  }

  if (body.notificationId) {
    await prisma.inAppNotification.updateMany({
      where: {
        id: body.notificationId,
        OR: [{ userId }, { userId: null }],
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return successResponse<{ success: boolean; markedAll?: boolean; updatedId?: string }>({
      success: true,
      updatedId: body.notificationId,
    });
  }

  return errorResponse("Missing notificationId or markAllAsRead flag", "INVALID_INPUT", 400);
});
