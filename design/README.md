# Design reference

These `.dc.html` files are the app's screens, exported from Claude Design. They're reference markup, not runnable code. Each one depends on the Claude Design runtime (`support.js`), which isn't in this repo.

Use them for exact layout, spacing, colors, type and copy, then rebuild them as real components. `docs/SPEC.md` section 4 has the design tokens and the map from screens to routes.

- Every number, date, add-on and reason in these files is fake sample data.
- `Log.dc.html` contains a working prototype of the set parser in its `parse()` method.
- `TabBar.dc.html` is the shared bottom navigation that the main screens import.
- Screens are 390 x 844 (iPhone). Home and Day are taller because they scroll.
