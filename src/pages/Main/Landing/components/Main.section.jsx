import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import Button from "../../../../components/Button.component";
import { useT } from "../../../../contexts/I18n.context";

export default function MainSection() {
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center px-6 pt-10">
      {/* The line breaks are the designer's, so they live in the copy alongside the
          words — each language breaks in a different place. */}
      <h1 className="font-serif text-[2.6rem] text-center whitespace-pre-line">
        {t("landing.hero.title")}
      </h1>

      <p className="text-[0.95rem] text-center leading-snug mt-6 max-w-md text-muted-foreground">
        {t("landing.hero.body")}
      </p>

      <span className="text-sm italic text-subtle mt-5">
        {t("common.noDownloadRequired")}
      </span>

      <Link to="/events/create" className="mt-7">
        <Button variant="primary" size="lg">
          {t("landing.hero.cta")}
          <ArrowRightIcon size={16} className="rtl:-scale-x-100" />
        </Button>
      </Link>

      {/* The page's LCP element, so it is served from our own origin rather than
          hot-linked off Framer's CDN: a 1MB PNG became a 195KB WebP, and the paint
          no longer waits on a third-party handshake. index.html preloads the same
          two candidates — keep the srcset and sizes here in step with it. The
          intrinsic dimensions are what stop the heading jumping when it lands. */}
      <img
        src="/uncached-hero-app.webp"
        srcSet="/uncached-hero-app-800.webp 800w, /uncached-hero-app.webp 1600w"
        sizes="(max-width: 800px) 115vw, 800px"
        width={1600}
        height={1716}
        fetchPriority="high"
        decoding="async"
        alt={t("landing.hero.imageAlt")}
        className="rotate-12 w-[115%] mt-14 mb-16 max-w-200 h-auto"
      />
    </div>
  );
}
