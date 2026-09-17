import { redirect } from "next/navigation";

// proxy.ts already gates every route: signed-in users never see "/" render
// (redirected to /outsourcing), signed-out users are sent to /login first.
// This is just the fallback for the one path proxy leaves alone.
export default function RootPage() {
  redirect("/outsourcing");
}
