import { Home3D } from "@/components/site/home-3d/home-3d";
import { loadHomeData } from "@/lib/home-data";

/** Homepage entry point. Variant B: a woven length of cloth rendered in 3D, then a tailor's-bench layout. */
export default async function HomePage() {
  const data = await loadHomeData();
  return <Home3D {...data} sections={data.content.sections} />;
}
