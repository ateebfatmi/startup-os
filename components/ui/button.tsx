import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost" | "outline";
  size?: "sm" | "md" | "icon";
};

export function Button({ className = "", variant = "solid", size = "md", ...props }: ButtonProps) {
  const variants = {
    solid: "bg-[#173f2b] text-white hover:bg-[#24563b]",
    ghost: "bg-transparent text-current hover:bg-black/5",
    outline: "border border-black/10 bg-white/70 text-[#17211b] hover:bg-white",
  };
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", icon: "h-10 w-10" };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
