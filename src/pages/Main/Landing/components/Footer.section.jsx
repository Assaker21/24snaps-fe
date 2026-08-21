export default function FooterSection() {
  return (
    <div className="bg-surface mt-16 px-5 py-10">
      <h3 className="font-serif text-2xl max-w-md">
        A single day becomes timeless, when remembered together.
      </h3>

      <p className="text-xs text-subtle mt-8">
        © {new Date().getFullYear()} 24snaps
      </p>
    </div>
  );
}
