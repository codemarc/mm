# Mail Minder Braintrailz

This file trailz is for the Braintrailz project. Its purpose is to record and track decisions, ideas, and other thoughts as we build the project.

## 2023-01-25 The Road to 1.0

Just as a fork has many tines so does a project have many branches. This is the third of many such branches. Perhaps it will become the main branch. 
Build, test, and release and repeat. Keep it simple. Revert to first principles.

## 2025-01-26 Bootstrapping Redux (again)

Added the Trailz file. Created the CHANGELOG.md file. Prepped the branch.
Seriously considered the package manager. This time we will use pnpm.
https://pnpm.io/

### patching

After trying to figure out how to update the global help in caporal, I decided to create a patch.
To create a patch for help.js, you can use the diff command-line tool to generate a patch file. Here's a step-by-step guide:

* Make a Backup of the Original File
* Edit the File
* npm install patch-package@latest --save-dev
* npx patch-package caporal
* updated package.json

"scripts": {
  "postinstall": "patch-package"
}

### npx in pnpm?

Running executables inside your downloaded dependencies  
For example npx jest.  
The pnpm equivalent is pnpm exec jest.  
Running executable commands in packages you want to download transiently  
For example npx create-react-app my-app.  
The pnpm equivalent of this is pnpm dlx create-react-app my-app.  
