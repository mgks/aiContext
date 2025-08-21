#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const CONFIG_FILE_NAME = 'aicontext.json';

// --- Base Configuration & Presets ---
// A sensible base that applies to most projects.
const BASE_CONFIG = {
  excludePaths: [
    'context.md', '.DS_Store', 'node_modules', 'vendor',
    '.git/', '.github/', 'dist/', 'build/', '.gradle/', '.idea/',
    '*.log', '*.lock', 'LICENSE', 'yarn.lock', 'package-lock.json',
  ],
  includeExtensions: [
    '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss',
    '.json', '.md', '.txt', '.yml', '.yaml', '.py',
  ],
  maxFileSizeKB: 500,
  outputFile: 'context.md',
  // New field to track applied presets in the config file
  presets: [],
};

// Presets are now ADDITIVE. They add to the base config.
const PRESETS = {
  nodejs: {
    excludePaths: ['coverage/', '.env'],
    includeExtensions: ['.mjs', '.cjs'],
  },
  android: {
    excludePaths: ['captures/', '*.apk', '*.aab', '*.iml', 'gradle/', 'gradlew', 'gradlew.bat', 'local.properties'],
    includeExtensions: ['.java', '.kt', '.kts', '.xml', '.gradle', '.pro'],
  },
  java: {
    excludePaths: ['target/', '.mvn/', '*.jar', '*.war', 'logs/'],
    includeExtensions: ['.java', '.xml', '.properties', '.pom'],
  },
  python: {
    excludePaths: ['__pycache__/', '.venv/', 'venv/', '*.pyc', '.env'],
    includeExtensions: ['.py'],
  }
};

// --- Configuration Management ---

function loadConfig() {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(fileContent);
    } catch (e) {
      console.warn(`⚠️ Warning: Could not parse ${CONFIG_FILE_NAME}. Using defaults. Error: ${e.message}`);
      return null;
    }
  }
  return null;
}

function saveConfig(config) {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  try {
    // Sort arrays for consistent output
    config.excludePaths.sort();
    config.includeExtensions.sort();
    config.presets.sort();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`💾 Configuration saved to ${CONFIG_FILE_NAME}`);
  } catch (e) {
    console.error(`❌ Error saving configuration to ${CONFIG_FILE_NAME}: ${e.message}`);
  }
}

function applyCliModifications(currentConfig, argv) {
  let modified = false;
  const newConfig = JSON.parse(JSON.stringify(currentConfig)); // Deep copy

  // Helper for unique array merging
  const mergeUnique = (target, source) => [...new Set([...target, ...source])];

  // Apply presets
  if (argv.preset && argv.preset.length > 0) {
    argv.preset.forEach(p => {
      if (PRESETS[p]) {
        if (!newConfig.presets.includes(p)) {
          newConfig.presets.push(p);
        }
        newConfig.excludePaths = mergeUnique(newConfig.excludePaths, PRESETS[p].excludePaths || []);
        newConfig.includeExtensions = mergeUnique(newConfig.includeExtensions, PRESETS[p].includeExtensions || []);
        modified = true;
      } else {
        console.warn(`⚠️ Warning: Preset '${p}' not found.`);
      }
    });
  }

  // Apply additions and subtractions for exclusions
  if (argv.addExclude) {
    newConfig.excludePaths = mergeUnique(newConfig.excludePaths, argv.addExclude);
    modified = true;
  }
  if (argv.removeExclude) {
    const toRemove = new Set(argv.removeExclude);
    newConfig.excludePaths = newConfig.excludePaths.filter(p => !toRemove.has(p));
    modified = true;
  }

  // Apply additions and subtractions for extensions
  if (argv.addExt) {
    const extensions = argv.addExt.map(e => e.startsWith('.') ? e : `.${e}`);
    newConfig.includeExtensions = mergeUnique(newConfig.includeExtensions, extensions);
    modified = true;
  }
  if (argv.removeExt) {
    const toRemove = new Set(argv.removeExt.map(e => e.startsWith('.') ? e : `.${e}`));
    newConfig.includeExtensions = newConfig.includeExtensions.filter(ext => !toRemove.has(ext));
    modified = true;
  }

  // Other direct settings
  if (argv.output && argv.output !== newConfig.outputFile) {
    newConfig.outputFile = argv.output;
    modified = true;
  }
  if (argv.maxSize && argv.maxSize !== newConfig.maxFileSizeKB) {
    newConfig.maxFileSizeKB = argv.maxSize;
    modified = true;
  }
  
  return { config: newConfig, modified };
}

// --- Main Execution ---
async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]\n\nCreates a comprehensive context file for AI assistants.')
    .option('preset', {
      alias: 'p',
      describe: 'Apply one or more presets (e.g., -p nodejs android). Updates config file.',
      type: 'array',
    })
    .option('add-exclude', {
      alias: 'a',
      describe: 'Add paths/patterns to exclude list.',
      type: 'array',
    })
    .option('remove-exclude', {
      alias: 'r',
      describe: 'Remove paths/patterns from exclude list.',
      type: 'array',
    })
    .option('add-ext', {
      describe: 'Add file extensions to include list.',
      type: 'array',
    })
    .option('remove-ext', {
      describe: 'Remove file extensions from include list.',
      type: 'array',
    })
    .option('output', {
      alias: 'o',
      describe: 'Set the output file name.',
      type: 'string',
    })
    .option('max-size', {
      describe: 'Set max file size in KB.',
      type: 'number',
    })
    .option('init', {
        describe: 'Initialize or update config without generating context.',
        type: 'boolean'
    })
    .option('debug', {
      describe: 'Enable debug mode to show the find command.',
      type: 'boolean',
    })
    .help()
    .alias('h', 'help')
    .argv;

  let config = loadConfig();
  const cliArgsProvided = Object.keys(argv).length > 2; // more than just $0 and _

  if (config === null) {
      console.log("No `aicontext.json` found. Using default configuration.");
      config = JSON.parse(JSON.stringify(BASE_CONFIG)); // Start with a fresh base config
  }
  
  if (cliArgsProvided) {
    const { config: newConfig, modified } = applyCliModifications(config, argv);
    if (modified) {
      saveConfig(newConfig);
      config = newConfig; // Use the newly modified config for the run
    }
  }

  if (argv.init) {
      console.log("✅ Configuration initialized/updated. Exiting without generating context file.");
      return;
  }
  
  // Pass the final config to the generation logic
  await generateContextFile(config, argv.debug);
}

// --- Core Logic (largely unchanged, but now accept config) ---

async function generateContextFile(config, debug = false) {
  console.log("\n🔍 Finding relevant files based on your configuration...");
  const initialFiles = await generateDirectoryTreeAsync(config, debug);

  // ... (rest of generateContextFile is the same as your original)
  // Just make sure it uses the passed `config` object.
  // Example:
  if (initialFiles.length === 0) {
      console.log("\n⚠️ No files found that match your criteria.");
      console.log("   Run `aicontext --init` to create a config file and customize it.");
      return;
  }

  console.log(`   Found ${initialFiles.length} potential files. Filtering by extension...`);

  const filesToProcess = initialFiles.filter(file => {
      if (config.includeExtensions.length === 0) return true;
      const ext = path.extname(file).toLowerCase();
      return config.includeExtensions.includes(ext);
  });

  if (filesToProcess.length === 0) {
      console.log(`\n⚠️ No files remaining after filtering by 'includeExtensions'.`);
      console.log(`   Initial find found ${initialFiles.length} files, but none had the required extensions.`);
      return;
  }
  console.log(`   Processing ${filesToProcess.length} files...`);

  const stats = { totalFilesFound: initialFiles.length, totalFilesProcessed: filesToProcess.length, includedFileContents: 0, skippedDueToSize: 0, skippedOther: 0, totalTokens: 0, totalOriginalSizeKB: 0 };
  const projectName = path.basename(process.cwd());
  let outputContent = `# Project Context: ${projectName}\n\nGenerated: ${new Date().toISOString()}\n\n`;
  outputContent += `## Configuration Used\n\n\`\`\`json\n${JSON.stringify({ presets: config.presets, outputFile: config.outputFile, maxFileSizeKB: config.maxFileSizeKB }, null, 2)}\n\`\`\`\n\n`;
  outputContent += `## Directory Structure\n\n\`\`\`\n${generateTreeStructure(filesToProcess)}\`\`\`\n\n`;
  outputContent += `## File Contents\n\n`;

  for (const filePath of filesToProcess) {
    const currentFileSizeKB = getFileSizeInKB(filePath);
    stats.totalOriginalSizeKB += currentFileSizeKB;

    if (currentFileSizeKB > config.maxFileSizeKB) {
      stats.skippedDueToSize++;
      outputContent += `### \`${filePath}\`\n\n*File content skipped: Size ${formatFileSize(currentFileSizeKB)} exceeds ${config.maxFileSizeKB} KB limit.*\n\n`;
      continue;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const language = getLanguageFromExt(filePath);
      stats.includedFileContents++;
      stats.totalTokens += estimateTokenCount(fileContent);
      outputContent += `### \`${filePath}\`\n\n\`\`\`${language}\n${fileContent.trim() ? fileContent : '[EMPTY FILE]'}\n\`\`\`\n\n`;
    } catch (error) {
      stats.skippedOther++;
      outputContent += `### \`${filePath}\`\n\n*Error reading file: ${error.message}*\n\n`;
      console.warn(`Warning on ${filePath}: ${error.message}`);
    }
  }

  const structureTokens = estimateTokenCount(outputContent.replace(/```[^`]*?\n[\s\S]*?\n```/g, ''));
  stats.totalTokens += structureTokens;

  fs.writeFileSync(config.outputFile, outputContent);
  console.log(`\n💾 Writing output to ${config.outputFile}...`);
  const outputFileSizeKB = getFileSizeInKB(config.outputFile);

  console.log("\n" + "=".repeat(60));
  console.log("📊 CONTEXT FILE STATISTICS");
  console.log("=".repeat(60));
  console.log(`  • Context file created: ${config.outputFile} (${formatFileSize(outputFileSizeKB)})`);
  console.log(`  • Estimated total tokens: ~${formatNumber(stats.totalTokens)}`);
  console.log(`\n  • Files found by search: ${stats.totalFilesFound}`);
  console.log(`  • Files processed (after ext filter): ${stats.totalFilesProcessed}`);
  console.log(`  • Content included: ${stats.includedFileContents} files`);
  console.log(`  • Skipped (size > ${config.maxFileSizeKB}KB): ${stats.skippedDueToSize} files`);
  console.log(`  • Skipped (read errors): ${stats.skippedOther} files`);
  console.log("=".repeat(60));
  console.log("✨ Done!");
}

async function generateDirectoryTreeAsync(config, debug = false) {
    let findCommandParts = ["find . -type f"]; // Start with files only

    const notPaths = [];
    const notNames = [];

    // Process exclusions
    config.excludePaths.forEach(p => {
        const pattern = p.replace(/'/g, "'\\''");
        if (pattern.endsWith('/')) {
            // Exclude directory and its contents: -not -path '*/dir/*'
            notPaths.push(`-path '*/${pattern.slice(0, -1)}/*'`);
        } else if (pattern.startsWith('*.')) {
            // Exclude by name pattern: -not -name '*.log'
            notNames.push(`-name '${pattern}'`);
        } else {
            // Exclude specific file or directory name anywhere
            notNames.push(`-name '${pattern}'`);
            notPaths.push(`-path '*/${pattern}/*'`);
        }
    });

    if (notNames.length > 0) {
        findCommandParts.push(`-not \\( ${notNames.join(' -o ')} \\)`);
    }
    if (notPaths.length > 0) {
        findCommandParts.push(`-not \\( ${notPaths.join(' -o ')} \\)`);
    }

    // Handle hidden files and directories (like .git)
    findCommandParts.push(`-not -path '*/.*/*' -not -name '.*'`);
    
    findCommandParts.push("| sort");
    const findCommand = findCommandParts.join(' ');

    if (debug) {
        console.log("DEBUG: Running find command:");
        console.log(findCommand);
    }
    
    // ... (rest of the exec promise logic is the same)
    return new Promise((resolve) => {
        exec(findCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (debug && stderr && stderr.trim().length > 0) {
                console.warn("DEBUG: `find` command emitted to STDERR:", stderr.trim());
            }
            if (error) {
                console.error(`\n❌ Error executing find command (exit code ${error.code}).`);
                resolve([]);
                return;
            }
            const files = stdout.split('\n').filter(line => line.trim() !== '');
            resolve(files);
        });
    });
}

// Your helper functions (getLanguageFromExt, etc.) remain here unchanged.
// ... (Make sure to include them)
function getFileSizeInKB(filePath) { try { const stats = fs.statSync(filePath); return stats.isFile() ? stats.size / 1024 : 0; } catch (error) { return 0; } }
function estimateTokenCount(text) { return Math.ceil(text.length * 0.25); }
function getLanguageFromExt(filePath) { const ext = path.extname(filePath).toLowerCase(); const filename = path.basename(filePath).toLowerCase(); if (filename === 'gradlew') return 'bash'; if (filename === 'proguard-rules.pro' || ext === '.pro') return 'properties'; if (filename.startsWith('readme')) return 'markdown'; if (filename === 'license') return 'text'; const langMap = { '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx', '.php': 'php', '.html': 'html', '.css': 'css', '.scss': 'scss', '.json': 'json', '.md': 'markdown', '.txt': 'text', '.yml': 'yaml', '.yaml': 'yaml', '.sh': 'bash', '.py': 'python', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp', '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.swift': 'swift', '.kt': 'kotlin', '.kts': 'kotlin', '.dart': 'dart', '.sql': 'sql', '.env': 'dotenv', '.config': 'plaintext', '.xml': 'xml', '.gradle': 'groovy', }; return langMap[ext] || 'plaintext'; }
function generateTreeStructure(files) { if (!files || files.length === 0) return "[No files to display]"; const tree = {}; files.forEach(file => { const parts = file.startsWith('./') ? file.substring(2).split('/') : file.split('/'); let current = tree; parts.forEach((part, i) => { const isFile = i === parts.length - 1; if (isFile) { current.files = current.files || []; current.files.push(part); } else { current[part] = current[part] || {}; current = current[part]; } }); }); const buildTree = (node, prefix = '') => { let result = ''; const dirs = Object.keys(node).filter(k => k !== 'files').sort(); const files = (node.files || []).sort(); dirs.forEach((dir, i) => { const isLast = i === dirs.length - 1 && files.length === 0; result += `${prefix}${isLast ? '└── ' : '├── '}📁 ${dir}/\n`; result += buildTree(node[dir], `${prefix}${isLast ? '    ' : '│   '}`); }); files.forEach((file, i) => { const isLast = i === files.length - 1; result += `${prefix}${isLast ? '└── ' : '├── '}📄 ${file}\n`; }); return result; }; return buildTree(tree); }
function formatFileSize(sizeInKB) { if (sizeInKB < 0.01 && sizeInKB > 0) return "< 0.01 KB"; if (sizeInKB === 0) return "0 KB"; return sizeInKB < 1024 ? `${sizeInKB.toFixed(2)} KB` : `${(sizeInKB / 1024).toFixed(2)} MB`; }
function formatNumber(num) { return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

main().catch(err => {
    console.error("\n❌ An unexpected error occurred:", err);
});