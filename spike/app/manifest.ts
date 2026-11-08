import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gym Tracker Spike",
    short_name: "GT Spike",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0D0C",
    theme_color: "#0D0D0C",
  };
}
