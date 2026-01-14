// file: scripts/validate_setup.ts
// description: Validates the development environment setup for Miro MCP integration
// reference: docs/SETUP.md

import { existsSync } from "fs";
import { join } from "path";

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
}

const checks: ValidationResult[] = [];

function add_check(name: string, passed: boolean, message: string): void {
  checks.push({ name, passed, message });
}

async function validate_bun(): Promise<void> {
  try {
    const version = Bun.version;
    add_check(
      "Bun Runtime",
      true,
      `✓ Bun ${version} detected`
    );
  } catch (error) {
    add_check(
      "Bun Runtime",
      false,
      "✗ Bun runtime not detected"
    );
  }
}

async function validate_git(): Promise<void> {
  try {
    const proc = Bun.spawn(["git", "--version"]);
    const output = await new Response(proc.stdout).text();
    const version = output.trim();
    add_check(
      "Git",
      true,
      `✓ ${version}`
    );
  } catch (error) {
    add_check(
      "Git",
      false,
      "✗ Git not installed or not in PATH"
    );
  }
}

async function validate_git_config(): Promise<void> {
  try {
    const name_proc = Bun.spawn(["git", "config", "user.name"]);
    const email_proc = Bun.spawn(["git", "config", "user.email"]);
    
    const name = await new Response(name_proc.stdout).text();
    const email = await new Response(email_proc.stdout).text();
    
    if (name.trim() && email.trim()) {
      add_check(
        "Git Configuration",
        true,
        `✓ User: ${name.trim()} <${email.trim()}>`
      );
    } else {
      add_check(
        "Git Configuration",
        false,
        "✗ Git user.name or user.email not configured"
      );
    }
  } catch (error) {
    add_check(
      "Git Configuration",
      false,
      "✗ Unable to read Git configuration"
    );
  }
}

function validate_project_structure(): void {
  const required_files = [
    "package.json",
    "tsconfig.json",
    "bunfig.toml",
    ".gitignore",
    ".cursor/mcp.json",
    "docs/SETUP.md",
    "docs/PROMPTS.md",
    "docs/WORKFLOWS.md"
  ];

  let all_exist = true;
  const missing_files: string[] = [];

  for (const file of required_files) {
    if (!existsSync(file)) {
      all_exist = false;
      missing_files.push(file);
    }
  }

  if (all_exist) {
    add_check(
      "Project Structure",
      true,
      `✓ All required files present (${required_files.length} files)`
    );
  } else {
    add_check(
      "Project Structure",
      false,
      `✗ Missing files: ${missing_files.join(", ")}`
    );
  }
}

async function validate_mcp_config(): Promise<void> {
  const mcp_config_path = ".cursor/mcp.json";
  
  if (!existsSync(mcp_config_path)) {
    add_check(
      "MCP Configuration",
      false,
      "✗ .cursor/mcp.json not found"
    );
    return;
  }

  try {
    const file = Bun.file(mcp_config_path);
    const content = await file.json();
    
    if (content.mcpServers?.miro?.url === "https://mcp.miro.com/") {
      add_check(
        "MCP Configuration",
        true,
        "✓ Miro MCP server configured correctly"
      );
    } else {
      add_check(
        "MCP Configuration",
        false,
        "✗ Miro MCP server URL not configured correctly"
      );
    }
  } catch (error) {
    add_check(
      "MCP Configuration",
      false,
      `✗ Error reading MCP config: ${error}`
    );
  }
}

async function validate_dependencies(): Promise<void> {
  const package_json_path = "package.json";
  
  if (!existsSync(package_json_path)) {
    add_check(
      "Dependencies",
      false,
      "✗ package.json not found"
    );
    return;
  }

  const has_node_modules = existsSync("node_modules");
  const has_bun_lockb = existsSync("bun.lockb");

  if (has_node_modules || has_bun_lockb) {
    add_check(
      "Dependencies",
      true,
      "✓ Dependencies installed (run 'bun install' to update)"
    );
  } else {
    add_check(
      "Dependencies",
      false,
      "✗ Dependencies not installed. Run: bun install"
    );
  }
}

function print_results(): void {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║        Miro MCP Development Environment Validation        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  let all_passed = true;

  for (const check of checks) {
    const status = check.passed ? "✓" : "✗";
    const color = check.passed ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    
    console.log(`${color}${status}${reset} ${check.name}`);
    console.log(`  ${check.message}\n`);
    
    if (!check.passed) {
      all_passed = false;
    }
  }

  console.log("─────────────────────────────────────────────────────────────\n");

  if (all_passed) {
    console.log("\x1b[32m✓ All checks passed!\x1b[0m\n");
    console.log("Next Steps:");
    console.log("1. Open Cursor IDE");
    console.log("2. Go to Settings (Ctrl+,) → Features → MCP Servers");
    console.log("3. Click 'Connect' next to 'miro'");
    console.log("4. Complete OAuth authentication");
    console.log("5. Start creating Miro boards with AI!\n");
    console.log("📚 See docs/SETUP.md for detailed instructions");
    console.log("💡 See docs/PROMPTS.md for effective prompts\n");
  } else {
    console.log("\x1b[31m✗ Some checks failed\x1b[0m\n");
    console.log("Please address the issues above before proceeding.");
    console.log("Refer to docs/SETUP.md for troubleshooting.\n");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await validate_bun();
  await validate_git();
  await validate_git_config();
  validate_project_structure();
  await validate_mcp_config();
  await validate_dependencies();
  
  print_results();
}

main();
