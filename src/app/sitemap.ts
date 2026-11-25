import type { MetadataRoute } from "next";

/* v0.135 — Las páginas públicas, para que Google las encuentre. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  if (!base) return [];
  const hoy = new Date();
  return [
    { url: `${base}/entrar`, lastModified: hoy, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/registro`, lastModified: hoy, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacidad`, lastModified: hoy, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/condiciones`, lastModified: hoy, changeFrequency: "yearly", priority: 0.2 },
  ];
}
