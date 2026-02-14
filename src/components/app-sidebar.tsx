import { Notebook, Pencil, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  getUniqueFilename,
  listFiles,
  readFile,
  writeFile,
} from "@/lib/filesystem";
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
      <TooltipTrigger asChild>
        <Button
          key={title}
          variant="ghost"
          className="size-7"
          onMouseDown={action}
        >
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
  const { setCurrentFile, buffer, currentFile } = useNoteStore();
  const [availableFilenames, setAvailableFilenames] = useState<string[]>([]);

  const topButtons = [
    {
      title: "New text note",
      action: async () => {
        const uniqueFilename = await getUniqueFilename({
          filename: "untitled",
          type: "md",
        });
        setCurrentFile({ filename: uniqueFilename, content: "", type: "md" });
      },
      icon: Notebook,
    },
    {
      title: "New drawing note",
      action: async () => {
        const uniqueFilename = await getUniqueFilename({
          filename: "untitled",
          type: "draw",
        });
        setCurrentFile({ filename: uniqueFilename, content: "", type: "draw" });
      },
      icon: Pencil,
    },
    {
      title: "Save file",
      action: async () => {
        if (!currentFile) return;
        await writeFile(currentFile);
      },
      icon: Save,
    },
  ];

  // biome-ignore lint/correctness/useExhaustiveDependencies: <Need to depend on currentFile>
  useEffect(() => {
    async function checkAvailableFiles() {
      const files = await listFiles();
      setAvailableFilenames(files.map((file) => file.split(".")[0]));
    }
    checkAvailableFiles();
  }, [currentFile]);

  return (
    <Sidebar className="border-none">
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
        <SidebarGroup className="pt-0">
          <SidebarGroupLabel>Buffer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {buffer.map((note) => (
                <SidebarMenuItem
                  key={note.filename}
                  onClick={() => setCurrentFile(note)}
                >
                  {note.filename}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Available files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {availableFilenames.map((filename) => (
                <SidebarMenuButton
                  size={"sm"}
                  key={filename}
                  onClick={async () => {
                    const content = await readFile({ filename, type: "md" });
                    setCurrentFile({
                      filename,
                      content: content || "",
                      type: "md",
                    });
                  }}
                >
                  {filename}
                </SidebarMenuButton>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
