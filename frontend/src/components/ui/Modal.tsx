import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/utils/utils"

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

export const Modal = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    className
}: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={cn(
                    "relative w-full max-w-lg bg-card text-card-foreground shadow-lg border border-border rounded-xl animate-in zoom-in-95 duration-200",
                    className
                )}
            >
                <div className="flex flex-col space-y-1.5 p-6 border-b border-border">
                    <div className="flex items-center justify-between">
                        {title && <h2 className="text-xl font-semibold leading-none tracking-tight">{title}</h2>}
                        <button
                            onClick={onClose}
                            className="rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </button>
                    </div>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
            <div
                className="fixed inset-0 -z-10"
                onClick={onClose}
            />
        </div>
    );
};
