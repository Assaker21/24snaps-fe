import { Menu } from "lucide-react";

export default function HeaderSection() {
  return (
    <div className="w-screen flex flex-row justify-between items-center p-4 bg-white fixed top-0 left-0 z-200 ">
      <h1 className="font-bold font-serif">24snaps</h1>

      <button className="cursor-pointer">
        <Menu />
      </button>
    </div>
  );
}
