import { Outlet } from "react-router";

// Deliberately chrome-free: every screen in the design reference carries its own
// header (a back chip, a cover hero, or the events list top bar), so a shared fixed
// header would sit on top of them.
export default function MainLayout() {
  return <Outlet />;
}
