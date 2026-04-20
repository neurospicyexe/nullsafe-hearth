import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hearth",
    short_name: "Hearth",
    description: "Halseth system dashboard",
    start_url: "/today",
    display: "standalone",
    background_color: "#0e0b08",
    theme_color: "#e8a83e",
    orientation: "portrait",
    icons: [
      {
        src: "/apple-icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
