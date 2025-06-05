#!/usr/bin/env python3

import os
import shutil
import sys

def check_npm_installed():
    # Check if 'npm' is in the system's PATH
    if shutil.which('npm'):
        print("npm is installed.")
    else:
        print("npm is not installed. Please install npm to continue.")
        sys.exit(1)

print("BUILD SCRIPT START")

check_npm_installed()
project_root = os.getcwd()

os.chdir("web")
os.system("npm install")
os.system("npm run build")

html_source = ""
with open("dist/index.html", "r") as f:
    html_source = f.read()

os.chdir(project_root)
with open("index.h", "w") as f:
    f.write("const char *HTML_CONTENT = R\"=====(\n" + html_source + "\n)=====\";\n")

print("BUILD SCRIPT COMPLETE")
