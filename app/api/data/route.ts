import { NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { prisma } from "@/lib/db";
import { ensureSuperTokensInit } from "@/app/config/backend";

ensureSuperTokensInit();

// POST endpoint to add a row to the table
export async function POST(request: NextRequest) {
  return withSession(request, async (err, session) => {
    if (err) {
      return NextResponse.json(err, { status: 500 });
    }
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    try {
      const body = await request.json();
      const { name, email } = body;

      if (!name || !email) {
        return NextResponse.json(
          { error: "Name and email are required" },
          { status: 400 }
        );
      }

      const user = await prisma.user.create({ data: { name, email } });

      return NextResponse.json(
        {
          success: true,
          id: user.id,
          message: "User added successfully",
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error adding user:", error);
      return NextResponse.json(
        { error: "Failed to add user" },
        { status: 500 }
      );
    }
  });
}

// GET endpoint to retrieve data from the table
export async function GET(request: NextRequest) {
  return withSession(request, async (err, session) => {
    if (err) {
      return NextResponse.json(err, { status: 500 });
    }
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(
        {
          success: true,
          data: users,
          count: users.length,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }
  });
}
