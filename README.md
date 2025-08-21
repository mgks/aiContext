# aiContext

[![NPM Version](https://img.shields.io/npm/v/aicontext.svg)](https://www.npmjs.com/package/aicontext)
[![License](https://img.shields.io/npm/l/aicontext.svg)](https://github.com/your-username/aicontext/blob/main/LICENSE)

A powerful CLI tool for generating high-signal, optimized code context for AI assistants and automated systems.

`aiContext` creates a single markdown file of your project's structure and contents, designed for maximum relevance and minimal token overhead. It's built for the era of AI-driven development, enabling agents and pipelines to get a reliable, deterministic, and project-aware context every time.

## Key Features

-   🤖 **AI-Ready Context**: Generates clean, structured context perfect for LLMs.
-   ⚙️ **Persistent Configuration**: Uses a `aicontext.json` file for reproducible context generation.
-   🧩 **Additive Presets**: Start with a solid baseline and layer on presets for technologies like `nodejs`, `python`, `rust`, and more.
-   📄 **`.gitignore` Aware**: Can automatically use your project's `.gitignore` file for exclusions.
-   🔧 **Granular Control**: Fine-tune your context with specific flags to add or remove files and extensions.

## Quick Start

Run this command in your project's root directory to get started. It will create a `aicontext.json` config file and then generate the context.

Install it globally for easier access:

```bash
npm install -g aicontext
```

## Usage

Run the tool from the root of your project directory.

```bash
# Run with the default Node.js preset
aicontext --preset nodejs

# Run with the Android preset and output to a different file
aicontext -p android -o MyAndroidApp.md

# Customize exclusions and add new extensions
aicontext --exclude 'docs/' --ext swift
```

### Options

| Flag                 | Alias | Description                                        | Type    |
| -------------------- | ----- | -------------------------------------------------- | ------- |
| `--preset`           | `-p`  | Use a preset (`nodejs`, `android`, `java`)         | string  |
| `--include`          | `-i`  | Specific paths to include.                         | array   |
| `--exclude`          | `-e`  | Additional paths or patterns to exclude.           | array   |
| `--ext`              |       | Additional file extensions to include.             | array   |
| `--output`           | `-o`  | Name of the output markdown file.                  | string  |
| `--max-size`         |       | Maximum file size in KB to include.                | number  |
| `--debug`            |       | Enable debug mode to show the `find` command.      | boolean |
| `--help`             | `-h`  | Show help.                                         |         |


## Documentation

**For detailed usage, configuration, and examples, please visit our full [documentation website](https://docs.mgks.dev/create-context/).**.