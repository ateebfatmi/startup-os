import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost" | "outline";
  size?: "sm" | "md" | "icon";
};

export function Button({ className = "", variant = "solid", size = "md", ...props }: ButtonProps) {
  const variants = {
    solid: "border border-[#173f2b] bg-[#173f2b] text-white shadow-[0_8px_20px_rgba(23,63,43,.14)] hover:border-[#24563b] hover:bg-[#24563b] hover:shadow-[0_10px_24px_rgba(23,63,43,.2)]",
    ghost: "border border-transparent bg-transparent text-current hover:bg-black/[.045]",
    outline: "border border-black/10 bg-white/80 text-[#17211b] shadow-[0_1px_2px_rgba(16,31,23,.04)] hover:border-black/15 hover:bg-white",
  };
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", icon: "h-10 w-10" };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
