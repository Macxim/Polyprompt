import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { keys, getUserData, setUserData } from "@/lib/redis";
import { Space } from "@/app/types";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = keys.spaces(userId);
  const { id } = params;

  const spaces = await getUserData<Space>(key);
  const filteredSpaces = spaces.filter((s) => s.id !== id);

  await setUserData(key, filteredSpaces);

  return NextResponse.json({ success: true });
}
