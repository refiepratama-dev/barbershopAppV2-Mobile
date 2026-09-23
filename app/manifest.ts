import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rafel POS",
    short_name: "Rafel POS",
    description: "Aplikasi POS Barbershop Mobile Rafel Pangkas Rambut",
    start_url: "/",
    display: "standalone",
    background_color: "#3138E8",
    theme_color: "#EFEFEF",
    icons: [
      {
        src: "/icon", // Mengarah ke file app/icon.tsx
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
