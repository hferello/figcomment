import type { ComponentProps, ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function FieldSet({ className, ...props }: ComponentProps<"fieldset">) {
  return (
    <fieldset className={cn("flex flex-col gap-fc-24", className)} {...props} />
  );
}

function FieldLegend({ className, ...props }: ComponentProps<"legend">) {
  return (
    <legend
      className={cn("mb-fc-18 font-display text-fc-24 font-bold", className)}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex w-full flex-col gap-fc-18", className)}
      {...props}
    />
  );
}

function Field({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="group"
      className={cn("flex w-full flex-col gap-fc-12", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return <Label className={cn("w-fit text-fc-18", className)} {...props} />;
}

function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-fc-14 leading-normal text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function FieldError({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      role="alert"
      className={cn("text-fc-14 text-destructive", className)}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative flex items-center gap-fc-12", className)}>
      <Separator className="flex-1" />
      {children ? (
        <span className="text-fc-14 text-muted-foreground">{children}</span>
      ) : null}
      <Separator className="flex-1" />
    </div>
  );
}

export {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
};
