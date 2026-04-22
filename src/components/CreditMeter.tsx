import { Image, Video, Infinity as InfinityIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCredits } from "@/hooks/useCredits";

export function CreditMeter({ compact = false }: { compact?: boolean }) {
  const { imagesUsed, imagesLimit, videoSecondsUsed, videoSecondsLimit, unlimited, loading } = useCredits();

  if (loading) {
    return <Card className="h-24 animate-pulse bg-muted/30" />;
  }

  const imgPct = imagesLimit === Infinity ? 0 : Math.min(100, (imagesUsed / Math.max(1, imagesLimit)) * 100);
  const vidPct = videoSecondsLimit === Infinity ? 0 : Math.min(100, (videoSecondsUsed / Math.max(1, videoSecondsLimit)) * 100);

  return (
    <Card className={compact ? "space-y-3 p-4" : "space-y-4 p-5"}>
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>Kreditet ditore</span>
        <span className="text-[10px]">Reset çdo 24h</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2"><Image className="h-3.5 w-3.5 text-primary" /> Imazhe</span>
          <span className="font-mono text-xs text-muted-foreground">
            {unlimited ? <InfinityIcon className="h-3.5 w-3.5" /> : `${imagesUsed} / ${imagesLimit}`}
          </span>
        </div>
        {!unlimited && <Progress value={imgPct} className="h-1.5" />}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2"><Video className="h-3.5 w-3.5 text-primary" /> Video (sek)</span>
          <span className="font-mono text-xs text-muted-foreground">
            {unlimited ? <InfinityIcon className="h-3.5 w-3.5" /> : `${videoSecondsUsed} / ${videoSecondsLimit}`}
          </span>
        </div>
        {!unlimited && <Progress value={vidPct} className="h-1.5" />}
      </div>
    </Card>
  );
}