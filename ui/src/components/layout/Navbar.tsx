import { Link, useRouterState } from "@tanstack/react-router";
import {
    Wind,
    LayoutDashboard,
    Layers,
    Search,
    Moon,
    Sun,
    Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/streams", label: "Streams", icon: Layers },
    { to: "/dlq", label: "Dead Letter Queue", icon: Inbox },
] as const;

interface NavbarProps {
    onCommandPaletteOpen?: () => void;
}

export function Navbar({ onCommandPaletteOpen }: NavbarProps) {
    const [isDark, setIsDark] = useState(true);
    const routerState = useRouterState();
    const currentPath = routerState.location.pathname;

    useEffect(() => {
        // Check system preference on mount
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const stored = localStorage.getItem("theme");
        const shouldBeDark = stored ? stored === "dark" : prefersDark;
        setIsDark(shouldBeDark);

        if (shouldBeDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        localStorage.setItem("theme", newIsDark ? "dark" : "light");

        if (newIsDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-5xl items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <Wind className="h-6 w-6 text-primary" />
                        <span className="font-bold text-xl tracking-tight">windmill</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden items-center gap-1 md:flex">
                        {navItems.map((item) => {
                            const isActive = item.to === "/"
                                ? currentPath === "/"
                                : currentPath.startsWith(item.to);
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search trigger */}
                    <Button
                        variant="outline"
                        className="hidden h-9 w-64 justify-start gap-2 text-muted-foreground font-normal sm:flex"
                        onClick={onCommandPaletteOpen}
                    >
                        <Search className="h-4 w-4" />
                        <span>Search...</span>
                        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </Button>

                    {/* Mobile Search Icon */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden"
                        onClick={onCommandPaletteOpen}
                    >
                        <Search className="h-4 w-4" />
                    </Button>

                    {/* Theme toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Nav (Visible only on small screens) */}
            <nav className="flex justify-center border-t py-2 md:hidden">
                <div className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = item.to === "/"
                            ? currentPath === "/"
                            : currentPath.startsWith(item.to);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <Icon className="h-3 w-3" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </header>
    );
}
