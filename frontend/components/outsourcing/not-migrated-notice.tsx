import { Card, CardBody } from "@/components/ui/card";

export function NotMigratedNotice({ reason }: { reason: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm font-medium text-foreground">Noch nicht auf das neue Backend migriert</p>
        <p className="mt-1.5 text-sm text-muted-foreground">{reason}</p>
      </CardBody>
    </Card>
  );
}
