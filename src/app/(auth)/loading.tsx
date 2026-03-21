import { RouteLoadingShell } from "@/components/app/route-loading-shell";

export default function AuthLoading() {
  return (
    <RouteLoadingShell
      eyebrow="Opening Access"
      title="Preparing the sign-in screen."
      body="Runtime and session checks are still resolving. This stays quiet and brief."
      metricCount={1}
      sectionCount={1}
    />
  );
}

