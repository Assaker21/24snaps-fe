import { useState } from "react";
import { UserIcon } from "lucide-react";
import Button from "../../components/Button.component";
import Input from "../../components/Input.component";
import Sheet from "../../components/Sheet.component";
import usersService from "../../services/users.service";
import { useAuth } from "../../contexts/Auth.context";

// Google hands back whatever name sits on the account, which is often a legal name
// nobody at the party would recognise — and it goes straight onto every event the
// person hosts. Signing up is the one moment where changing it costs nothing, so a
// brand new Google account is asked to confirm it once, pre-filled, and never again.
export default function DisplayNamePopup({ open, setOpen, user }) {
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Seeded during render rather than from an effect, so the field is already filled
  // on the sheet's first frame — the same reset pattern as the sign-in sheet.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName([user?.firstName, user?.lastName].filter(Boolean).join(" "));
      setError("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed || !user?.id) return;

    // The row keeps a first and last name separately and the rest of the app builds
    // every greeting out of them, so one display name splits at the first space.
    const [firstName, ...rest] = trimmed.split(/\s+/);
    const lastName = rest.join(" ");

    setSaving(true);
    setError("");
    const response = await usersService.update(user.id, { firstName, lastName });
    setSaving(false);

    if (!response.ok) {
      setError(response.data?.message || "Couldn't save that name, try again.");
      return;
    }

    setUser((current) => ({ ...current, firstName, lastName }));
    setOpen(false);
  }

  return (
    <Sheet
      open={open}
      setOpen={setOpen}
      title="What should we call you?"
      description="This is the name your guests see on the events you host. You can change it later from your account."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-7">
        <Input
          autoFocus
          icon={<UserIcon size={16} />}
          placeholder="Your name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          disabled={saving || !name.trim()}
          className="w-full justify-center"
        >
          {saving ? "Saving…" : "That's me"}
        </Button>
      </form>
    </Sheet>
  );
}
