#!/usr/bin/env python3
import sys
import os

def create_component(name: str):
    """
    生成 Storio 黑金風格的 Next.js 元件
    """
    content = f"""'use client';

import React from 'react';

interface {name}Props {{
  title?: string;
  className?: string;
}}

const {name}: React.FC<{name}Props> = ({{ title, className = "" }}) => {{
  return (
    <div className={{`p-6 border border-storio-gold/20 bg-storio-gray/50 rounded-xl backdrop-blur-md transition-all hover:border-storio-gold/50 ${{className}}`}}>
      <h3 className="text-storio-gold font-bold text-xl mb-2">{{title || '{name}'}}</h3>
      <div className="text-gray-400 text-sm">
        Storio Brick Component
      </div>
    </div>
  );
}};

export default {name};
"""
    path = f"client/src/components/{name}.tsx"
    with open(path, "w") as f:
        f.write(content)
    
    print(f"Successfully created UI component: {name} at {path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        create_component(sys.argv[1])
    else:
        print("Usage: python3 create_ui_component.py <name>")
