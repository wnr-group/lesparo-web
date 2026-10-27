import { HomeVideo } from "@/components/site/home-video/home-video";
import { loadHomeData } from "@/lib/home-data";

/** Homepage entry point. Variant A: cinematic video-led experience. */
export default async function HomePage() {
  const data = await loadHomeData();
  return <HomeVideo {...data} sections={data.content.sections} />;
}
