import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import {
    LayoutDashboard,
    Layers,
    AlertCircle,
    RefreshCw,
    Moon,
    Sun,
    Search,
    Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    keywords?: string[];
}

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);

    const toggleTheme = useCallback(() => {
        const isDark = document.documentElement.classList.contains("dark");
        if (isDark) {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        } else {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        }
        onOpenChange(false);
    }, [onOpenChange]);

    const commands: CommandItem[] = [
        {
            id: "overview",
            label: "Go to Overview",
            icon: LayoutDashboard,
            action: () => { navigate({ to: "/" }); onOpenChange(false); },
            keywords: ["home", "dashboard", "main"],
        },
        {
            id: "streams",
            label: "Go to Streams",
            icon: Layers,
            action: () => { navigate({ to: "/streams" }); onOpenChange(false); },
            keywords: ["redis", "messages", "queue"],
        },
        {
            id: "dlq",
            label: "Go to Dead Letter Queue",
            icon: Inbox,
            action: () => { navigate({ to: "/dlq" }); onOpenChange(false); },
            keywords: ["errors", "failed", "dead letter"],
        },
        {
            id: "refresh",
            label: "Refresh Page",
            icon: RefreshCw,
            action: () => { window.location.reload(); },
            keywords: ["reload", "update"],
        },
        {
            id: "theme",
            label: "Toggle Theme",
            icon: document.documentElement.classList.contains("dark") ? Sun : Moon,
            action: toggleTheme,
            keywords: ["dark", "light", "mode"],
        },
    ];

    const filteredCommands = commands.filter((cmd) => {
        const searchLower = search.toLowerCase();
        return (
            cmd.label.toLowerCase().includes(searchLower) ||
            cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower))
        );
    });

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setSearch("");
            setSelectedIndex(0);
        }
    }, [open]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!open) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.max(i - 1, 0));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                        filteredCommands[selectedIndex].action();
                    }
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, filteredCommands, selectedIndex]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-lg">
                <div className="flex items-center border-b px-3">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                        className="flex h-12 w-full bg-transparent py-3 px-2 text-sm outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Type a command or search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {filteredCommands.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No commands found.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredCommands.map((cmd, index) => {
                                const Icon = cmd.icon;
                                return (
                                    <button
                                        key={cmd.id}
                                        className={cn(
                                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-left transition-colors",
                                            index === selectedIndex
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                        onClick={cmd.action}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{cmd.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
