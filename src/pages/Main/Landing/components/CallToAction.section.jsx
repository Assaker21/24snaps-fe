import { ArrowRightIcon } from "lucide-react";

export default function CallToActionSection() {
  return (
    <div className="px-4 overflow-hidden flex flex-col md:items-center">
      <h3 className="font-serif text-2xl mb-6 md:text-center">
        Life happens once.
        <br />
        Don't let it fade away.
      </h3>

      <button className="text-sm flex flex-row gap-2 items-center py-3 px-4 bg-blue-300 rounded-2xl">
        Create your event <ArrowRightIcon size={15} />
      </button>

      <img
        src="https://framerusercontent.com/images/kIelIN6AxscJt8f3pUY5zYOdo.png?scale-down-to=2048&width=1383&height=2853"
        className="rotate-18 mt-8 mb-8 max-w-100 block md:hidden"
      />

      <div className="flex-row gap-2 hidden md:flex">
        <img
          src="https://framerusercontent.com/images/4aAjYc6CalXwF0WkSeLOW5UsM.png?width=1473&height=1862"
          className="mt-8 mb-8 w-full hidden md:block"
        />
        <img
          src="https://framerusercontent.com/images/KKVOFA2ckloq0lpKglfy1UtTk6w.png?width=1480&height=1832"
          className="mt-8 mb-8 w-full hidden md:block"
        />
      </div>
    </div>
  );
}
