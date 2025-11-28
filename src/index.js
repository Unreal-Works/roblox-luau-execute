#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import fs from "fs";
import { getApiContext } from "./apiContext.js";
import { runCloudLuau, uploadPlace } from "./cloudLuauRunner.js";

dotenv.config({ quiet: true });

const program = new Command();

program
    .name("roblox-luau-execute")
    .description("Run scripts in Roblox Luau")
    .option("-s, --script <path>", "Path to the Luau script file if not provided inline")
    .option("-p, --place <path>", "Path to an optional Roblox place file to execute the script in")
    .argument("[luau]", "Inline Luau code to execute if --script is not provided")
    .action(async (luau, options) => {
        const { ROBLOSECURITY } = process.env;
        if (!ROBLOSECURITY) {
            console.error("ROBLOSECURITY environment variable is not set.");
            process.exit(1);
        }

        const context = await getApiContext(ROBLOSECURITY);

        let scriptContents;
        if (options.script) {
            scriptContents = fs.readFileSync(options.script, "utf-8");
        } else if (luau) {
            scriptContents = luau;
        } else {
            console.error("No Luau script provided. Use --script or provide inline code.");
            process.exit(1);
        }

        const placePath = options.place;
        const versionNumber = placePath ? await uploadPlace(context, placePath) : null;

        return await runCloudLuau({
            executionKey: context.apiKey,
            universeId: context.universeId,
            placeId: context.placeId,
            versionNumber,
            scriptContents,
        });
    });

program.parse();
