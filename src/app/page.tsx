import { redirect } from "next/navigation";

// Time Clock is the default landing page while Dashboard stays hidden from the rail.
export default function Home() {
  redirect("/time");
}
