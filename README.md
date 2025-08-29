# aiContext

<p>
  <a href="https://www.npmjs.com/package/@mgks/aicontext"><img src="https://img.shields.io/npm/v/@mgks/aicontext.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@mgks/aicontext"><img src="https://img.shields.io/npm/d18m/@mgks/aicontext.svg" alt="npm downloads"></a>
  <a href="https://github.com/mgks/aiContext/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mgks/aiContext.svg" alt="license"></a>
</p>

A powerful CLI tool for generating high-signal, optimized code context for AI assistants and automated systems.

`aiContext` creates a single markdown file of your project's structure and contents, designed for maximum relevance and minimal token overhead. It's built for the era of AI-driven development, enabling agents and pipelines to get a reliable, deterministic, and project-aware context every time.

## Key Features

-   🤖 **AI-Ready Context**: Generates clean, structured context perfect for LLMs.
-   ⚙️ **Persistent Configuration**: Uses an `aicontext.json` file for reproducible context generation.
-   🧩 **Additive Presets**: Start with a solid baseline and layer on presets for technologies like `nodejs`, `python`, `rust`, and more.
-   📄 **`.gitignore` Aware**: Can automatically use your project's `.gitignore` file for exclusions.
-   🔧 **Granular Control**: Fine-tune your context with specific flags to add or remove files and extensions.
-   🎯 **Force Inclusion**: A new `--include` flag to grab specific files or directories, even if they are hidden (e.g., `.github/`).

## Quick Start

Run this command in your project's root directory to get started. It will create a `aicontext.json` config file and then generate the context instantly.

```bash
npx @mgks/aicontext -p nodejs
```

**Recommended:** Install it globally for easier access:

```bash
npm install -g @mgks/aicontext
```

## Usage

After global installation, you can use the simple aicontext command anywhere on your system.

```bash
# Run with the default Node.js preset
aicontext --preset nodejs

# Run with the Android preset and output to a different file
aicontext -p android -o MyAndroidApp.md

# Customize exclusions and add new extensions
aicontext --exclude 'docs/' --ext swift
```

### Options

| Flag               | Alias | Description                                                                  |
| ------------------ | ----- | ---------------------------------------------------------------------------- |
| `--preset`         | `-p`  | Applies one or more technology presets (e.g., `nodejs`, `python`).           |
| `--include`        | `-i`  | Forcefully includes a path, even if it's hidden (e.g., `.github/`).          |
| `--add-exclude`    | `-a`  | Adds a path or pattern to the exclusion list (e.g., `dist/`).                |
| `--remove-exclude` | `-r`  | Removes a path or pattern from the exclusion list.                           |
| `--use-gitignore`  |       | Sets whether to use the `.gitignore` file (`true` or `false`).               |
| `--reset`          |       | **Destructive.** Resets the configuration to defaults before applying flags. |
| `--init`           |       | Updates the config file but does not generate the context.                   |
| `--output`         | `-o`  | Sets the name of the output file (e.g., `project-context.md`).               |
| `--help`           | `-h`  | Displays the help menu with all available commands.                          |


## Documentation

**For detailed usage, configuration, and examples, please visit our full [documentation website](https://docs.mgks.dev/ai-context/).**

**[GitHub Sponsors](https://github.com/sponsors/mgks): Become a monthly or one-time GitHub sponsor to support aiContext & other projects developed by [@mgks](https://mgks.dev).**