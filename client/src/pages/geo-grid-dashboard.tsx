import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function GeoGridDashboard() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your Geo Grid campaigns
          </p>
        </div>

        <Link href="/analyze">
          <Button variant="default" className="gap-2">
            + New Project
          </Button>
        </Link>
      </div>
    </div>
  );
}
