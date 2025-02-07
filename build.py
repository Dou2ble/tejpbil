#!/usr/bin/env python3

import os

print("BUILD SCRIPT START")

project_root = os.getcwd()

os.chdir("web")
os.system("pnpm build")

html_source = ""
with open("dist/index.html", "r") as f:
    html_source = f.read()

os.chdir(project_root)
with open("index.h", "w") as f:
    f.write("const char *HTML_CONTENT = R\"=====(\n" + html_source + "\n)=====\";\n")

print("BUILD SCRIPT COMPLETE")
