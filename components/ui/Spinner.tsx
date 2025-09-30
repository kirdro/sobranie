import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12"
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg"
};

export function Spinner({ size = "md", className, text }: SpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        {/* Внешнее кольцо */}
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-transparent bg-gradient-to-r from-accent-purple via-accent-teal to-accent-amber bg-clip-border",
            sizeClasses[size]
          )}
          style={{
            background: "conic-gradient(from 0deg, #a855f7, #2dd4bf, #f59e0b, #a855f7)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), white calc(100% - 2px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), white calc(100% - 2px))"
          }}
        />

        {/* Внутренний пульсирующий центр */}
        <div
          className={cn(
            "absolute inset-1 rounded-full bg-accent-teal/30 animate-pulse",
            size === "sm" && "inset-0.5",
            size === "xl" && "inset-2"
          )}
        />

        {/* Центральная точка */}
        <div
          className={cn(
            "absolute inset-2 rounded-full bg-white/80",
            size === "sm" && "inset-1",
            size === "xl" && "inset-4"
          )}
        />
      </div>

      {text && (
        <p className={cn("text-dawn/70 animate-pulse", textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  );
}

// Компонент для полноэкранной загрузки
export function FullScreenSpinner({ text = "Загружаем..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 backdrop-blur-sm">
      <Spinner size="xl" text={text} />
    </div>
  );
}

// Компонент для inline загрузки в кнопках
export function ButtonSpinner({ size = "sm" }: { size?: "sm" | "md" }) {
  return <Spinner size={size} className="mr-2" />;
}

// Компонент для загрузки контента в панелях
export function PanelSpinner({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size="lg" text={text} />
    </div>
  );
}