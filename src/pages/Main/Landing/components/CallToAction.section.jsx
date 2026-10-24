import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import Button from "../../../../components/Button.component";
import { useT } from "../../../../contexts/I18n.context";

export default function CallToActionSection() {
  const t = useT();

  return (
    <div className="px-4 pt-16 overflow-hidden flex flex-col items-center text-center">
      <h2 className="font-serif text-3xl mb-7 whitespace-pre-line">
        {t("landing.cta.title")}
      </h2>

      <Link to="/events/create">
        <Button variant="primary" size="lg">
          {t("landing.hero.cta")}
          <ArrowRightIcon size={16} className="rtl:-scale-x-100" />
        </Button>
      </Link>

      <img
        src="uncached-call-to-action-1.png"
        alt=""
        className="rotate-12 mt-10 mb-8 max-w-100 block md:hidden"
      />

      <div className="flex-row gap-3 hidden md:flex">
        <img
          src="uncached-call-to-action-1.png"
          alt=""
          className="mt-10 mb-8 w-full"
        />
        <img
          src="uncached-call-to-action-1.png"
          alt=""
          className="mt-10 mb-8 w-full"
        />
      </div>
    </div>
  );
}
