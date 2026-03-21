import { RouteLoadingShell } from "@/components/app/route-loading-shell";

export default function AppLoading() {
  return (
    <RouteLoadingShell
      eyebrow="Loading Beside You"
      title="Rebuilding the current study view."
      body="The next screen is streaming in now. Shared layout controls stay usable while the current route data resolves."
      metricCount={4}
      sectionCount={2}
    />
  );
}

