// Naming an event type in the viewer's language.
//
// The catalogue of types lives in the backend (`config/eventTypes.js`, seeded
// create-only into the `eventType` table), so every row arrives carrying an English
// `name` — and the house rule is that no user-facing string comes from anywhere but
// src/locales/strings.json. The two are reconciled here rather than by translating in
// the database: a name edited there is a fresh install's wording, not four languages.
//
// Keyed by `code`, which is the stable half of the row — the thing the wizard's icons
// and name suggestions are already keyed by — so renaming a type in the database can
// never silently drop its translation.
//
// The server's own `name` is the fallback, which matters because the catalogue is
// data: a type added to it later renders in English until someone writes its row here,
// instead of showing a raw `eventType.foo` key. `translate()` returns the key it was
// given when it has nothing, which is what makes that comparison the test.
export function eventTypeName(t, type) {
  if (!type) return "";

  const key = `eventType.${type.code}`;
  const translated = t(key);

  return translated === key ? type.name || "" : translated;
}
