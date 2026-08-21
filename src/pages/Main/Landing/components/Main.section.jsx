import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import Button from "../../../../components/Button.component";

export default function MainSection() {
  return (
    <div className="flex flex-col items-center justify-center px-6 pt-10">
      <h1 className="font-serif text-[2.6rem] text-center">
        Capture <br /> your day through <br /> everyone's eyes.
      </h1>

      <p className="text-[0.95rem] text-center leading-snug mt-6 max-w-md text-muted-foreground">
        24snaps is a premium private photo sharing app for events. Guests join
        via QR (no download), snap memorable photos, and the album reveals after
        the event.
      </p>

      <span className="text-sm italic text-subtle mt-5">
        No download required.
      </span>

      <Link to="/events/create" className="mt-7">
        <Button variant="primary" size="lg">
          Create your film
          <ArrowRightIcon size={16} />
        </Button>
      </Link>

      <img
        src="https://framerusercontent.com/images/yE5qTYqfi86r0Wy4jK6SdnWI.png?scale-down-to=2048&width=2694&height=2888"
        alt=""
        className="rotate-12 w-[115%] mt-14 mb-16 max-w-200"
      />
    </div>
  );
}
