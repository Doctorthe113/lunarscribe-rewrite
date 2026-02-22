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
} from "@/components/ui/sidebar";
import { createFile, listFiles, readFile, saveFile } from "@/lib/filesystem";
import { type Note, useNoteStore } from "@/lib/note-zustand";
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
  const { setCurrentFile, currentFile } = useNoteStore();
  const [availableFiles, setAvailableFiles] = useState<Note[]>([]);

  const topButtons = [
    {
      title: "New text note",
      action: async () => {
        const filename = await createFile("md", "");
        setCurrentFile({ filename, content: "", type: "md" });
      },
      icon: Notebook,
    },
    {
      title: "New drawing note",
      action: async () => {
        const filename = await createFile("draw", "");
        setCurrentFile({ filename, content: "", type: "draw" });
      },
      icon: Pencil,
    },
    {
      title: "Save file",
      action: async () => {
        if (!currentFile) return;
        await saveFile(
          currentFile.filename,
          currentFile.type,
          currentFile.content,
        );
      },
      icon: Save,
    },
  ];

  const changeTabs = async (
    newTabFilename: string,
    newTabType: "md" | "draw",
  ) => {
    const content = currentFile?.content || "";
    const type = currentFile?.type || "md";
    await saveFile(currentFile?.filename || newTabFilename, type, content);

    const newContent = await readFile({
      filename: newTabFilename,
      type: newTabType,
    });
    setCurrentFile({
      filename: newTabFilename,
      content: newContent || "",
      type: newTabType,
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <Need to depend on currentFile>
  useEffect(() => {
    async function checkAvailableFiles() {
      const files = await listFiles();
      const notes: Note[] = files.map((file) => {
        const [name, ext] = file.split(".");
        return {
          filename: name,
          content: "",
          type: ext === "draw" ? "draw" : "md",
        };
      });
      setAvailableFiles(notes);
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
        <SidebarGroup>
          <SidebarGroupLabel>Available files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {availableFiles.map((note) => (
                <SidebarMenuButton
                  size={"sm"}
                  key={note.filename}
                  onClick={async () =>
                    await changeTabs(note.filename, note.type)
                  }
                >
                  {note.filename}
                </SidebarMenuButton>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
