import { getDashboard } from "@/lib/dashboard";

// Full order list for the Reports popup. The dashboard page only sends one page of rows.
export async function GET() {
  const result = await getDashboard();
  if (!result.ok) {
    return Response.json({ message: result.message }, { status: 500 });
  }
  return Response.json({ lines: result.lines });
}
