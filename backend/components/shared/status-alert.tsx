import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type StatusNotice = {
  kind: "error" | "success";
  message: string;
};

type StatusAlertProps = {
  notice: StatusNotice | null;
  error_title: string;
  success_title: string;
  className?: string;
};

/**
 * Consistent success/error presentation for interactive forms and controls.
 */
export function StatusAlert({
  notice,
  error_title,
  success_title,
  className,
}: StatusAlertProps) {
  if (!notice) {
    return null;
  }

  return (
    <Alert
      variant={notice.kind === "error" ? "destructive" : "default"}
      className={className}
    >
      <AlertTitle>{notice.kind === "error" ? error_title : success_title}</AlertTitle>
      <AlertDescription>{notice.message}</AlertDescription>
    </Alert>
  );
}
