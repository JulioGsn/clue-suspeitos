"use client";
import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 px-3 py-1.5",
    ghost: "bg-transparent text-indigo-600 px-2 py-1",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
