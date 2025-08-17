"use client";

import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  disabled = false, 
  type = "button",
  variant = "primary",
  className = "" 
}) => {
  const baseClasses = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg";
  const variantClasses = variant === "primary" 
    ? "bg-purple-600 text-white hover:bg-purple-700" 
    : "bg-gray-200 text-gray-800 hover:bg-gray-300";
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;