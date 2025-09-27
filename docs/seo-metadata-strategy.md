# SEO & Metadata Strategy (Refinement Plan)

Status: Draft

## Problems Identified

- Oversized global `keywords` array dilutes topical relevance.
- Missing per‑page topical focus (e.g., frequency education vs app utility vs presets).
- Limited structured data breadth (only Breadcrumbs currently).

## Guiding Principles

1. Relevance > volume: Only include keywords that align with on‑page content.
2. Intent segmentation: Home (value proposition), App (/app functional), Learn (educational), Presets (conversion / internal linking).
3. Structured data: Use schema.org types suited to intent (SoftwareApplication, FAQPage, Article).
4. Content depth: Each learn page should have >600 words of original explanatory text, headings every 150–250 words.

## Page Archetypes

| Route        | Purpose                            | Schema                           | Notes                                                                 |
| ------------ | ---------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| `/`          | Brand + overview                   | `WebSite`, `SoftwareApplication` | Clear CTA to /app, highlight open-source & PWA                        |
| `/app`       | Functional mixer                   | (Breadcrumbs)                    | Minimal meta, canonical self; avoid marketing fluff                   |
| `/presets`   | Hub listing                        | `ItemList`                       | Already partly implemented; expand descriptions (benefits + safe use) |
| `/presets/*` | Specific intent (sleep/focus/calm) | `Article`                        | Add usage guidance + disclaimers                                      |
| `/learn/*`   | Educational pillar pages           | `Article`, optional `FAQPage`    | Interlink to related learn topics & presets                           |
| `/faq`       | Support / trust                    | `FAQPage`                        | Highlight privacy, no sign-up, open-source                            |

## Metadata Reduction Example

Global keywords reduced to core set:

```
[binaural beats, isochronic tones, brainwave entrainment, focus audio, sleep sounds, meditation audio tool, sound design, white noise, pink noise, brown noise]
```

Per-page expansion happens only if terms appear in visible content.

## Structured Data Additions

1. Root:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "NeuraTone",
  "operatingSystem": "Web",
  "applicationCategory": "SoundGeneratorApplication",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
```

2. FAQ (/faq): Emit `FAQPage` with Q/A arrays.
3. Learn Articles: Each page gets `Article` with `headline`, `datePublished`, `dateModified`, `author: Organization`.
4. Preset Pages: Use `Article` + internal linking block ("Try in Mixer").

## Internal Linking Blocks

- Bottom of each learn page: Related topics (3–5) + deep links to relevant preset.
- Avoid overusing exact-match anchor text; vary phrasing.

## Canonicals & Indexing

- `/app` self-canonical (keep indexable for feature queries).
- Ensure no duplication between root hero text and `/app` hidden SEO block; keep minimal hidden content.

## Roadmap Steps

1. Prune global keywords list.
2. Add SoftwareApplication JSON-LD to root layout (or a dedicated component).
3. Implement per-route metadata modules with descriptive `description` ≤ 160 chars.
4. Add FAQ schema.
5. Expand learn pages with semantic sections (H2/H3).
6. Add sitemap lastModified for evolving learn pages.
7. Periodic performance: track impressions & CTR in GSC; adjust headline copy.

## Success Metrics

- Reduced HTML `<head>` size.
- Improved average position for core terms (binaural beats generator, isochronic tone maker, focus sound tool).
- Increased clicks to preset pages from learn content.

---

Draft prepared; refine once content outlines approved.
