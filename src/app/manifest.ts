import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gym Tracker",
    short_name: "Gym Tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0D0C",
    theme_color: "#0D0D0C",
  };
}
