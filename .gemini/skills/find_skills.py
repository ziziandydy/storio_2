#!/usr/bin/env python3
import os
import ast
import glob

SKILLS_DIR = os.path.dirname(os.path.abspath(__file__))

def get_skill_description(file_path):
    """
    解析 Python 檔案，讀取模組級別的 Docstring
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read())
            return ast.get_docstring(tree) or "No description provided."
    except Exception as e:
        return f"Error reading description: {e}"

def list_skills():
    """
    列出所有可用技能及其描述
    """
    print(f"🔍 Scanning skills in: {SKILLS_DIR}\n")
    print(f"{ 'SKILL NAME':<30} | {'DESCRIPTION'}")
    print("-" * 80)

    # 尋找所有 .py 檔案（排除 __init__.py）
    skill_files = glob.glob(os.path.join(SKILLS_DIR, "*.py"))
    
    for file_path in sorted(skill_files):
        filename = os.path.basename(file_path)
        if filename == "__init__.py":
            continue
            
        skill_name = filename
        description = get_skill_description(file_path).split('\n')[0] # 只取第一行
        
        print(f"{skill_name:<30} | {description}")

if __name__ == "__main__":
    list_skills()
