[⬅️ Back to Frontend Engineering](../README.md)

# SEO Fundamentals

Search Engine Optimization (SEO) at the HTML level centers on generating clean, indexable, and semantic markup that helps search crawlers parse, catalog, and index your application's content accurately.

---

## Why It Matters

Proper SEO foundations increase organic discoverability, control how your links display when shared across social channels, and enable rich search snippets. Ensuring the correct use of structural metadata prevent crawlers from penalizing your site for duplicate content or ignoring deep routes.

---

## Core Concepts

### 1. Header Metadata

Search engine crawlers analyze the `<head>` of your HTML document to capture the page identity:

- **Title Tag (`<title>`)**: The primary text displayed in search results and browser tabs. Limit titles to 50–60 characters to prevent visual truncation in search layout displays.
- **Meta Description (`<meta name="description">`)**: A brief summary of the page content. Keep descriptions between 120–160 characters. While not a direct ranking factor, a high-quality description increases click-through rates (CTR).

### 2. Social Meta Tags (Open Graph & Twitter Cards)

Open Graph (OG) protocol metadata governs how page previews appear when shared on platforms like Slack, LinkedIn, or Facebook:

```html
<meta property="og:title" content="Page Title Example" />
<meta property="og:description" content="Brief page summary." />
<meta property="og:image" content="https://example.com/assets/og-image.jpg" />
<meta property="og:type" content="article" />
```

### 3. Duplicate Content & Canonical Links

If your site serves identical content under different parameters (e.g., query strings like `?ref=ad` or distinct URLs like `http://example.com` and `https://www.example.com`), search engines may penalize your ranking. Use the canonical link tag to declare the single authoritative source URL:

```html
<link rel="canonical" href="https://example.com/authoritative-page" />
```

### 4. Structured Data (JSON-LD)

Structured data provides explicit search engine instructions about page content categories, enabling rich search features (like review stars, FAQs, or event listings). Write structured data using the JSON-LD format inside a `<script>` tag:

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": "HTML SEO Fundamentals Guide",
    "author": {
      "@type": "Person",
      "name": "Vishwajeet Kondi"
    }
  }
</script>
```

---

## Real-World Production Learnings

In a marketing page redesign, our build pipeline accidentally generated static canonical link references pointing to our staging environment (`https://staging.example.com/blog/...`) instead of production. Search engine bots crawling the production site followed the canonical links, flagged the production site as a duplicate, and de-indexed our actual production pages from search results. Setting up dynamic canonical URL generation during compile time and adding CI/CD checks to block non-production canonical domains fixed the indexation pipeline.

---

## Best Practices

- **Robots Meta Directives**: Use `<meta name="robots" content="index, follow">` to instruct bots to index the page and follow all links. Use `noindex, nofollow` strictly on private profiles or admin pages.
- **Header Tag Ordering**: Ensure `<title>` and critical meta tags appear within the first 1,024 bytes of the HTML response. Some crawlers stop parsing headers if they exceed early buffer limits.
- **Image Alts**: Crawlers read `alt` text on `<img>` tags to index images in visual search results.

---

## Related Reading

- [Semantic HTML](./semantic-html.md)
- [HTML Foundations](./basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.html.seo-fundamentals.md)
