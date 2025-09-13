"use client";
import { usePathname } from "next/navigation";
import Script from "next/script";

function toTitle(segment: string) {
  return segment
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function BreadcrumbsJsonLd() {
  const pathname = usePathname();
  if (!pathname) return null;
  const parts = pathname.split("/").filter(Boolean);
  const items = [
    { position: 1, name: "Home", item: "/" },
    ...parts.map((seg, i) => ({
      position: i + 2,
      name: toTitle(seg),
      item: "/" + parts.slice(0, i + 1).join("/"),
    })),
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it) => ({
      "@type": "ListItem",
      position: it.position,
      name: it.name,
      item: it.item,
    })),
  };
  return (
    <Script
      id="breadcrumbs-jsonld"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
