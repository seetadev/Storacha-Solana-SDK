"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div className={`rounded-lg bg-white drop-shadow-lg p-8 ${className}`}>
      {children}
    </div>
  );
};

export default Card;