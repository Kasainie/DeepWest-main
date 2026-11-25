import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.Group>) => (
  <ResizablePrimitive.Group
    className={cn("h-full w-full", className)}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.Separator
    className={cn(
      "relative flex shrink-0 items-center justify-center bg-border data-[aria-orientation=vertical]:h-full data-[aria-orientation=vertical]:w-px data-[aria-orientation=horizontal]:h-px data-[aria-orientation=horizontal]:w-full after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 data-[aria-orientation=horizontal]:after:inset-x-0 data-[aria-orientation=horizontal]:after:left-0 data-[aria-orientation=horizontal]:after:top-1/2 data-[aria-orientation=horizontal]:after:h-1 data-[aria-orientation=horizontal]:after:w-full data-[aria-orientation=horizontal]:after:-translate-y-1/2 data-[aria-orientation=horizontal]:after:translate-x-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 [&[aria-orientation=horizontal]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
