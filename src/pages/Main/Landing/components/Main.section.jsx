export default function MainSection() {
  return (
    <div className="flex flex-col items-center justify-center">
      <h2 className="font-serif font-bold text-3xl text-center mt-12">
        Capture <br /> your day through <br /> everyone's eyes.
      </h2>
      <p className="font-regular text-sm text-center px-8 leading-tight mt-6 text-gray-800">
        24snaps is a premium private photo sharing app for events. Guests join
        via QR (no download), snap memorable photos, and the album reveals after
        the event.
      </p>

      <span className="p-2 px-3 rounded-xl text-sm mt-8 italic">
        No download required.
      </span>

      <img
        src="https://framerusercontent.com/images/yE5qTYqfi86r0Wy4jK6SdnWI.png?scale-down-to=2048&width=2694&height=2888"
        className="rotate-20 w-[120%] mt-16 mr-20 mb-20 max-w-200"
      />
    </div>
  );
}
