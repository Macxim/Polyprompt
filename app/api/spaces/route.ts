import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { keys, getUserData, setUserData } from "@/lib/redis";
import { Space } from "@/app/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = keys.spaces(userId);
  const spaces = await getUserData<Space>(key);

  return NextResponse.json(spaces);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = keys.spaces(userId);
  const body = await req.json();

  if (Array.isArray(body)) {
    // Bulk update (e.g., during migration)
    await setUserData(key, body);
    return NextResponse.json(body);
  } else {
    // Single space update
    const spaces = await getUserData<Space>(key);
    const updatedSpace = body as Space;
    const index = spaces.findIndex((s) => s.id === updatedSpace.id);

    if (index > -1) {
      spaces[index] = updatedSpace;
    } else {
      spaces.push(updatedSpace);
    }

    await setUserData(key, spaces);
    return NextResponse.json(updatedSpace);
  }
}
