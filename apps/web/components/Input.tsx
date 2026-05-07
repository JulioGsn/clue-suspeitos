"use client";
import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  className?: string;
};

export default function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input className="border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" {...props} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
