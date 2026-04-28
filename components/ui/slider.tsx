'use client';

import * as React from 'react';

interface SliderProps {
  id?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  id,
  min,
  max,
  step,
  value,
  onValueChange,
  disabled,
  className = '',
}: SliderProps) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange(parseFloat(e.target.value))}
      className={`w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    />
  );
}
