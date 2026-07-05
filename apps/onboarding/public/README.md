# Static assets (served at the site root)

Place the brand logo here as **`logo.png`** (the crystal "N").

- Path: `apps/onboarding/public/logo.png`
- It is served at `/logo.png` and used by the in-app `<Logo>` mark and the
  browser favicon.
- A square image works best (the provided 960×960 is ideal). Until this file
  exists, the app falls back to an inline SVG crystal, so nothing breaks.
- For the cleanest look in the UI, a transparent-background version is ideal,
  but the artwork is displayed in a rounded tile so a solid dark background also
  looks intentional.
