import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import Button from "../../../../components/Button.component";

export default function MainSection() {
  return (
    <div className="flex flex-col items-center justify-center px-6 pt-10">
      <h1 className="font-serif text-[2.6rem] text-center">
        Capture <br /> your day through <br /> everyone&apos;s eyes.
      </h1>

      <p className="text-[0.95rem] text-center leading-snug mt-6 max-w-md text-muted-foreground">
        Sawwerna is a premium private photo sharing app for events. Guests join
        via QR (no download), snap memorable photos, and the album reveals after
        the event.
      </p>

      <span className="text-sm italic text-subtle mt-5">
        No download required.
      </span>

      <Link to="/events/create" className="mt-7">
        <Button variant="primary" size="lg">
          Create your event
          <ArrowRightIcon size={16} />
        </Button>
      </Link>

      {/* The page's LCP element, so it is served from our own origin rather than
          hot-linked off Framer's CDN: a 1MB PNG became a 195KB WebP, and the paint
          no longer waits on a third-party handshake. index.html preloads the same
          two candidates — keep the srcset and sizes here in step with it. The
          intrinsic dimensions are what stop the heading jumping when it lands. */}
      <img
        src="/hero-app.webp"
        srcSet="/hero-app-800.webp 800w, /hero-app.webp 1600w"
        sizes="(max-width: 800px) 115vw, 800px"
        width={1600}
        height={1716}
        fetchPriority="high"
        decoding="async"
        alt="Two phones showing a Sawwerna album: a wedding cover with the moment count and countdown, and the in-browser camera mid-shot."
        className="rotate-12 w-[115%] mt-14 mb-16 max-w-200 h-auto"
      />
    </div>
  );
}
