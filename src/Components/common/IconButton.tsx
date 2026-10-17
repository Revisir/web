import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/Components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/Components/ui/tooltip";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "children" | "aria-label" | "title"> & {
  // Required: icon-only buttons have no other accessible name.
  label: string;
  children: ReactNode;
};

export default function IconButton({ label, children, variant = "ghost", size = "icon", ...props }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size={size} aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
