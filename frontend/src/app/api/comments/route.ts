import { NextRequest, NextResponse } from "next/server";

// In-memory store for comments (use a real database in production)
// This persists across requests but resets on server restart
const commentsStore = new Map<string, Comment[]>();

interface Comment {
  id: string;
  reportId: number;
  author: string; // wallet address or anonymous
  text: string;
  timestamp: number;
  reactions: {
    helpful: number;
    thankyou: number;
  };
}

// GET - Fetch comments for a report
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");

  if (!reportId) {
    return NextResponse.json({ error: "reportId is required" }, { status: 400 });
  }

  const comments = commentsStore.get(reportId) || [];

  return NextResponse.json({
    comments: comments.sort((a, b) => b.timestamp - a.timestamp),
    total: comments.length,
  });
}

// POST - Add a new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, author, text } = body;

    if (!reportId || !text) {
      return NextResponse.json(
        { error: "reportId and text are required" },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: "Comment too long (max 500 characters)" },
        { status: 400 }
      );
    }

    const comment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      reportId: Number(reportId),
      author: author || "Anonymous",
      text: text.trim(),
      timestamp: Date.now(),
      reactions: {
        helpful: 0,
        thankyou: 0,
      },
    };

    const reportKey = String(reportId);
    const existing = commentsStore.get(reportKey) || [];
    commentsStore.set(reportKey, [...existing, comment]);

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error) {
    console.error("Comment error:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

// PATCH - Add reaction to a comment
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, commentId, reaction } = body;

    if (!reportId || !commentId || !reaction) {
      return NextResponse.json(
        { error: "reportId, commentId, and reaction are required" },
        { status: 400 }
      );
    }

    if (!["helpful", "thankyou"].includes(reaction)) {
      return NextResponse.json(
        { error: "Invalid reaction type" },
        { status: 400 }
      );
    }

    const reportKey = String(reportId);
    const comments = commentsStore.get(reportKey) || [];
    const commentIndex = comments.findIndex((c) => c.id === commentId);

    if (commentIndex === -1) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    comments[commentIndex].reactions[reaction as "helpful" | "thankyou"]++;
    commentsStore.set(reportKey, comments);

    return NextResponse.json({
      success: true,
      comment: comments[commentIndex],
    });
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json({ error: "Failed to add reaction" }, { status: 500 });
  }
}
