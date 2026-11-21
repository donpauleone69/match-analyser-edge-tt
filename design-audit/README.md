# Design audit

The UI pass for Edge TT Match Analyser. Nothing here is the shipping app.

- `audit-report.md` is the stage 1 record of what was on screen.
- `inventory.md` lists every surface. The mapping onto proposed parts is `design-system.md` section 7.
- `design-system.md` is the system: tokens, components, and the Set Tagger zones.
- `tokens/base.css` holds the token values.
- `themes/` holds scorebook, daylight and lamplight. `themes/themes.md` says what each one is for.
- `previews/` is the interactive frames.
- `screenshots/current/` is the stage 1 shots of the app as it was.

## Open the previews

Serve the repository root, so the token and theme paths resolve, and open `design-audit/previews/index.html`.

The controls outside the device are not part of the app. It opens on Scorebook. Fit to window is off, so the frame is 1:1 and the page scrolls. Phone and tablet frames set a coarse pointer.

The screens are the Set Tagger, Matches, Details, Insights and Account. Zone strips switches Set and Rally from the documented 40/64 to the 48/80 option, on tablet landscape and desktop only. The default stays 40/64.
