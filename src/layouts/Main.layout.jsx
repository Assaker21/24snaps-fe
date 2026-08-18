import { Outlet } from "react-router";
import HeaderSection from "../pages/Main/Landing/components/Header.section";

export default function MainLayout() {
  return (
    <>
      <HeaderSection />
      <div className="h-10" />
      <Outlet />
    </>
  );
}
