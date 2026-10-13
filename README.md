# scienceof.science

A self-contained, static primer on metascience, its history, funding, incentives, and research practices.

## Preview

From this directory, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. There is no build step or dependency installation. You can also open `index.html` directly; clipboard access may depend on the browser.

## Files

- `index.html`: complete article, metadata, internal citations, and annotated reading list.
- `assets/styles.css`: responsive layout and print styles.
- `assets/site.js`: three illustrative models, navigation progress, source filtering, and sharing/printing tools.
- `assets/favicon.svg`: site icon.
- The original long HTML filename remains an entry point and redirects to `index.html`, mapping its old section anchors.

All editorial content and references are readable without JavaScript. Interactive figures have explanatory fallbacks. The site uses system fonts, requires no third-party requests, and stores no visitor data.

## Editorial conventions

Keep the focus on science and its historical and institutional context. Attribute numerical claims, distinguish empirical findings from policy proposals, and state the assumptions and limits of simulations. Add source links beside substantive claims and an annotated entry in the reading room. Funding comparisons and historical episodes are selective rather than exhaustive.

The network and publication-bias models use fixed seeds so comparisons are repeatable. The multiple-testing model uses random draws; its analytical reference is `1 - 0.95 ** k` under independent, valid tests and no multiplicity correction.

## Hosting

Serve this directory as a static site with `index.html` as the default document. The canonical URL and share link are set to `https://scienceof.science/`. Connecting the domain and deploying are separate hosting steps; this checkout does not configure DNS or publish automatically.
