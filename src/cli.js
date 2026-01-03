#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import { executeLuau } from "./index.js";

dotenv.config({ quiet: true });

const program = new Command();

program
    .name("rbxluau")
    .description("All-in-one toolkit to seamlessly execute Roblox Luau")
    .option("-s, --script <path>", "Path to the Luau script file if not provided inline")
    .option("-p, --place <path>", "Path to an optional Roblox place file to execute the script in")
    .option("-l, --local", "Run the Luau script on a local Roblox Studio instance")
    .option("-o, --out <path>", "Write execution output to a file")
    .option("--silent", "Suppress Roblox output in the terminal")
    .option("--no-exit", "Do not call process.exit after completion")
    .option("--timeout <duration>", "Set the maximum execution time for cloud runs (e.g., '30s', '2m')", "60s")
    .argument("[luau]", "Inline Luau code to execute if --script is not provided")
    .action(executeLuau);

program.parse();
