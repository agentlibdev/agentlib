#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname, relative } from "path";

const tsconfig = JSON.parse(readFileSync("./tsconfig.json", "utf-8"));
const paths = tsconfig.compilerOptions.paths || {};

// Create alias mappings from source to actual paths
const aliasMappings = {};
for (const [pattern, [pathPattern]] of Object.entries(paths)) {
  const alias = pattern.replace("/*", "");
  const pathPrefix = pathPattern.replace("/*", "");
  aliasMappings[alias] = pathPrefix;
}

console.log("Alias mappings:", aliasMappings);

// Recursively find all .js files in .test-dist
function findJsFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

const jsFiles = findJsFiles("./.test-dist");

console.log(`Found ${jsFiles.length} JS files to process`);

let replacementCount = 0;

for (const filePath of jsFiles) {
  let content = readFileSync(filePath, "utf-8");
  const originalContent = content;
  
  // For each alias, replace imports
  for (const [alias, sourcePath] of Object.entries(aliasMappings)) {
    // Match: from "@alias/path.js" or from '@alias/path'
    const regex = new RegExp(`from ['"](${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})/([^'"]+)['"\"']`, "g");
    
    content = content.replace(regex, (match, aliasName, importPath) => {
      // Calculate relative path from current file to the source
      const fileDir = dirname(filePath);
      // Ensure importPath has .js extension if not already there
      const withJs = importPath.endsWith(".js") ? importPath : `${importPath}.js`;
      // Map from source path to test-dist path
      const testDistSourcePath = sourcePath.replace("packages/", ".test-dist/packages/");
      const targetPath = join(testDistSourcePath, withJs);
      const relPath = relative(fileDir, targetPath);
      
      // Ensure relative path starts with ./ if it's in current or parent directory
      const normalizedPath = relPath.startsWith(".") ? relPath : "./" + relPath;
      
      return `from "${normalizedPath}"`;
    });
  }
  
  if (content !== originalContent) {
    writeFileSync(filePath, content, "utf-8");
    replacementCount++;
    console.log(`✓ Updated: ${filePath}`);
  }
}

console.log(`\n✓ Post-processed ${replacementCount} files`);
