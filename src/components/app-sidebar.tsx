import { Notebook, Pencil, Save, Trash } from "lucide-react";
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
  createFile,
  deleteFile,
  listFiles,
  readFile,
  saveFile,
} from "@/lib/filesystem";
import { useGlobalStore } from "@/lib/global-zustand";
import { type Note, useNoteStore } from "@/lib/note-zustand";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { DarkmodeToggle } from "./ui/darkmode-toggle";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
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

type DeleteFileDialogProps = {
  note: Note;
  isSelected: boolean;
  onDelete: (note: Note) => Promise<void>;
};

function DeleteFileDialog({
  note,
  isSelected,
  onDelete,
}: DeleteFileDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isSelected}
          className="size-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash className="size-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {note.filename}?</DialogTitle>
          <DialogDescription>
            Permanently remove this note. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(note)}
            >
              Delete
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppSidebar() {
  const { setCurrentFile, currentFile } = useNoteStore();
  const setActiveWindow = useGlobalStore((s) => s.setActiveWindow);
  const [availableFiles, setAvailableFiles] = useState<Note[]>([]);

  const topButtons = [
    {
      title: "New text note",
      action: async () => {
        const filename = await createFile("md", "");
        setCurrentFile({ filename, content: "", type: "md" });
        setActiveWindow("text");
      },
      icon: Notebook,
    },
    {
      title: "New drawing note",
      action: async () => {
        const filename = await createFile("draw", "");
        setCurrentFile({ filename, content: "", type: "draw" });
        setActiveWindow("draw");
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
    // only save if we have a current file and it's not the one we're opening
    if (currentFile.filename && currentFile.filename !== newTabFilename) {
      await saveFile(
        currentFile.filename,
        currentFile.type,
        currentFile.content,
      );
    }

    const newContent = await readFile({
      filename: newTabFilename,
      type: newTabType,
    });

    setCurrentFile({
      filename: newTabFilename,
      content: newContent || "",
      type: newTabType,
    });

    setActiveWindow(newTabType === "draw" ? "draw" : "text");
  };

  const refreshFiles = async () => {
    const files = await listFiles();
    const notes: Note[] = files
      .map((file) => {
        const parts = file.split(".");
        const ext = parts.pop();
        const name = parts.join(".");
        return {
          filename: name,
          content: "",
          type: (ext === "draw" ? "draw" : "md") as Note["type"],
        };
      })
      .sort((a, b) => a.filename.localeCompare(b.filename));
    setAvailableFiles(notes);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <Need to depend on currentFile>
  useEffect(() => {
    refreshFiles();
  }, [currentFile.filename, currentFile.type]);

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
          <DarkmodeToggle />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Available files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {availableFiles.map((note) => {
                const Icon = note.type === "draw" ? Pencil : Notebook;
                const isSelected =
                  currentFile.filename === note.filename &&
                  currentFile.type === note.type;
                return (
                  <SidebarMenuItem
                    key={`${note.filename}-${note.type}`}
                    className="group/item relative flex items-center overflow-hidden"
                  >
                    <SidebarMenuButton
                      size={"sm"}
                      onClick={async () =>
                        await changeTabs(note.filename, note.type)
                      }
                      className={cn(
                        "transition-all",
                        isSelected && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Icon className="size-3 text-foreground/20" />
                      <span>{note.filename}</span>
                    </SidebarMenuButton>

                    <div className="absolute -right-8 flex items-center gap-1 rounded-md bg-sidebar/80 px-1 opacity-0 backdrop-blur-sm transition-all group-hover/item:right-1 group-hover/item:opacity-100">
                      <DeleteFileDialog
                        note={note}
                        isSelected={isSelected}
                        onDelete={async (n) => {
                          await deleteFile(n);
                          await refreshFiles();
                        }}
                      />
                    </div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
