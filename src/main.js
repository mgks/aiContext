const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { BASE_CONFIG, PRESETS, loadConfig, saveConfig } = require('./config');
const { generateContextFile } = require('./generator');

/**
 * Applies modifications from CLI arguments to a configuration object.
 * @param {object} currentConfig The starting configuration.
 * @param {object} argv The parsed yargs arguments.
 * @returns {{config: object, modified: boolean}} The new config and a flag indicating if changes were made.
 */
function applyCliModifications(currentConfig, argv) {
  let modified = false;
  // Create a deep copy to avoid side effects.
  const newConfig = JSON.parse(JSON.stringify(currentConfig));

  // Helper to merge arrays while maintaining uniqueness.
  const mergeUnique = (target, source) => [...new Set([...target, ...source])];

  // Apply presets if provided.
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

  // Apply additions and removals for exclusion paths.
  if (argv.addExclude) {
    newConfig.excludePaths = mergeUnique(newConfig.excludePaths, argv.addExclude);
    modified = true;
  }
  if (argv.removeExclude) {
    const toRemove = new Set(argv.removeExclude);
    newConfig.excludePaths = newConfig.excludePaths.filter(p => !toRemove.has(p));
    modified = true;
  }

  // Apply additions and removals for included extensions.
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

  // Handle direct settings overrides.
  if (argv.output && argv.output !== newConfig.outputFile) {
    newConfig.outputFile = argv.output;
    modified = true;
  }
  if (argv.maxSize && argv.maxSize !== newConfig.maxFileSizeKB) {
    newConfig.maxFileSizeKB = argv.maxSize;
    modified = true;
  }
  
  // Handle the useGitignore setting.
  if (argv.useGitignore !== undefined && argv.useGitignore !== newConfig.useGitignore) {
    newConfig.useGitignore = argv.useGitignore;
    modified = true;
  }

  // Handle include paths additions.
  if (argv.include) {
    newConfig.includePaths = mergeUnique(newConfig.includePaths || [], argv.include);
    modified = true;
  }
  
  return { config: newConfig, modified };
}

/**
 * The main entry point for the CLI application.
 */
async function run() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]\n\nCreates a comprehensive context file for AI assistants.')
    .option('reset', {
        describe: 'Reset configuration to base defaults before applying other flags.',
        type: 'boolean',
    })
    .option('include', {
      alias: 'i',
      describe: 'Force inclusion of specific paths, even if they are hidden.',
      type: 'array',
    })
    .option('preset', {
      alias: 'p',
      describe: 'Apply one or more presets (e.g., -p nodejs android). Updates config file.',
      type: 'array',
    })
    .option('add-exclude', {
      alias: 'a',
      describe: 'Add paths/patterns to the exclusion list.',
      type: 'array',
    })
    .option('remove-exclude', {
      alias: 'r',
      describe: 'Remove paths/patterns from the exclusion list.',
      type: 'array',
    })
    .option('add-ext', {
      describe: 'Add file extensions to the inclusion list.',
      type: 'array',
    })
    .option('remove-ext', {
      describe: 'Remove file extensions from the inclusion list.',
      type: 'array',
    })
    .option('output', {
      alias: 'o',
      describe: 'Set the output file name.',
      type: 'string',
    })
    .option('max-size', {
      describe: 'Set max file size in KB to include.',
      type: 'number',
    })
    .option('use-gitignore', {
        describe: 'Enable or disable using .gitignore for exclusions.',
        type: 'boolean'
    })
    .option('init', {
        describe: 'Initialize or update config file without generating context.',
        type: 'boolean'
    })
    .option('debug', {
      describe: 'Enable debug mode to show the generated `find` command.',
      type: 'boolean',
    })
    .help()
    .alias('h', 'help')
    .argv;

  let config = loadConfig();

  if (argv.reset) {
      console.log("🔄 Resetting configuration to defaults...");
      config = null; // Setting config to null will trigger the creation of a fresh config file.
  }

  // Determine if the user provided any CLI arguments that modify the configuration.
  const hasCliModifiers = argv.preset || argv.addExclude || argv.removeExclude || argv.addExt || argv.removeExt || argv.output || argv.maxSize || argv.useGitignore || argv.include;

  if (config === null) {
      console.log("...Initializing new configuration.");
      config = JSON.parse(JSON.stringify(BASE_CONFIG));
  }
  
  if (hasCliModifiers || argv.reset) {
    const { config: newConfig, modified } = applyCliModifications(config, argv);
    if (modified || argv.reset) {
      saveConfig(newConfig);
      config = newConfig;
    }
  }

  if (argv.init) {
      console.log("✅ Configuration initialized/updated. Exiting without generating context file.");
      return;
  }
  
  // Pass the final, effective configuration to the generation logic.
  await generateContextFile(config, argv.debug);
}

module.exports = { run };