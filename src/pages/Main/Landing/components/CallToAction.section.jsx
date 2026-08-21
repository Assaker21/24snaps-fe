import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import Button from "../../../../components/Button.component";

export default function CallToActionSection() {
  return (
    <div className="px-4 pt-16 overflow-hidden flex flex-col items-center text-center">
      <h2 className="font-serif text-3xl mb-7">
        Life happens once.
        <br />
        Don't let it fade away.
      </h2>

      <Link to="/events/create">
        <Button variant="primary" size="lg">
          Create your event
          <ArrowRightIcon size={16} />
        </Button>
      </Link>

      <img
        src="https://framerusercontent.com/images/kIelIN6AxscJt8f3pUY5zYOdo.png?scale-down-to=2048&width=1383&height=2853"
        alt=""
        className="rotate-12 mt-10 mb-8 max-w-100 block md:hidden"
      />

      <div className="flex-row gap-3 hidden md:flex">
        <img
          src="https://framerusercontent.com/images/4aAjYc6CalXwF0WkSeLOW5UsM.png?width=1473&height=1862"
          alt=""
          className="mt-10 mb-8 w-full"
        />
        <img
          src="https://framerusercontent.com/images/KKVOFA2ckloq0lpKglfy1UtTk6w.png?width=1480&height=1832"
          alt=""
          className="mt-10 mb-8 w-full"
        />
      </div>
    </div>
  );
}
