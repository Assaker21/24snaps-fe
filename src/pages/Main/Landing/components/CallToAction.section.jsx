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
        src="call-to-action-1.png"
        alt=""
        className="rotate-12 mt-10 mb-8 max-w-100 block md:hidden"
      />

      <div className="flex-row gap-3 hidden md:flex">
        <img src="call-to-action-1.png" alt="" className="mt-10 mb-8 w-full" />
        <img src="call-to-action-1.png" alt="" className="mt-10 mb-8 w-full" />
      </div>
    </div>
  );
}
