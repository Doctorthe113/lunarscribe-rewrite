import { Notebook, Pencil } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { useNoteStore } from "@/lib/note-zustand";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const ButtonWithTooltip: React.FC<{
  title: string;
  icon: React.ElementType;
  action: () => void;
}> = ({ title, icon: Icon, action }) => {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button key={title} variant="outline" size="sm" onMouseDown={action}>
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export function AppSidebar() {
  const { setCurrentFile } = useNoteStore();
  const topButtons = [
    {
      title: "New text note",
      action: () =>
        setCurrentFile({ filename: "untitled", content: "", type: "md" }),
      icon: Notebook,
    },
    {
      title: "New drawing note",
      action: () =>
        setCurrentFile({ filename: "untitled", content: "", type: "draw" }),
      icon: Pencil,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex w-full items-center justify-center gap-2">
          {topButtons.map((button) => (
            <ButtonWithTooltip
              key={button.title}
              title={button.title}
              icon={button.icon}
              action={button.action}
            />
          ))}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Buffer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Available files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
