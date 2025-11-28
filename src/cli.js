#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import { executeLuau } from "./index.js";

dotenv.config({ quiet: true });

const program = new Command();

program
    .name("roblox-luau-execute")
    .description("Run scripts in Roblox Luau")
    .option("-s, --script <path>", "Path to the Luau script file if not provided inline")
    .option("-p, --place <path>", "Path to an optional Roblox place file to execute the script in")
    .argument("[luau]", "Inline Luau code to execute if --script is not provided")
    .action(executeLuau);

program.parse();
