import fs from "fs";
import os from "os";
import path from "path";
import { getApiContext } from "roblox-api-keygen";
import { runCloudLuau, uploadPlace } from "./cloudLuauRunner.js";
import { PlaceRunner } from "./placeRunner.js";

function getCommandOptions(commandOrOptions) {
    if (commandOrOptions && typeof commandOrOptions.opts === "function") {
        return commandOrOptions.opts();
    }
    return commandOrOptions || {};
}

function createOutputWriter(outPath) {
    if (!outPath) {
        return null;
    }

    const resolvedPath = path.resolve(outPath);

    try {
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        const stream = fs.createWriteStream(resolvedPath, { flags: "w" });

        return {
            path: resolvedPath,
            write(message, level = "info") {
                if (stream.destroyed || stream.closed || stream.writableEnded) {
                    return;
                }

                const prefix = level && level !== "info" ? `[${level.toUpperCase()}] ` : "";
                const payload = typeof message === "string" ? message : JSON.stringify(message);
                const lines = payload.split(/\r?\n/);
                if (lines.length > 0 && lines[lines.length - 1] === "") {
                    lines.pop();
                }

                if (lines.length === 0) {
                    stream.write(`${prefix}${os.EOL}`);
                } else {
                    for (const line of lines) {
                        stream.write(`${prefix}${line}${os.EOL}`);
                    }
                }
            },
            async close() {
                if (stream.destroyed || stream.closed || stream.writableEnded) {
                    return;
                }

                await new Promise((resolve, reject) => {
                    stream.end((err) => (err ? reject(err) : resolve()));
                });
            },
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to prepare output file at ${resolvedPath}: ${message}`);
    }
}

export async function executeLuau(luau, command) {
    const options = getCommandOptions(command);

    let outputWriter;
    if (options.out) {
        try {
            outputWriter = createOutputWriter(options.out);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (options.exit === false) {
                throw err instanceof Error ? err : new Error(message);
            }
            console.error(message);
            process.exit(1);
        }
    }

    const record = (message, level = "info") => {
        if (outputWriter && message) {
            outputWriter.write(message, level);
        }
    };

    let exitCode = 1;

    try {
        let scriptContents;

        if (options.script) {
            try {
                scriptContents = fs.readFileSync(options.script, "utf-8");
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                throw new Error(`Failed to read script at ${options.script}: ${message}`);
            }
        } else if (luau) {
            scriptContents = luau;
        } else {
            throw new Error("No Luau script provided. Use --script or provide inline code.");
        }

        const { ROBLOSECURITY } = process.env;

        if (options.local || !ROBLOSECURITY) {
            const runnerOptions = { ...options, scriptContents, outputWriter };
            exitCode = await new PlaceRunner(runnerOptions).run();
        } else {
            const context = await getApiContext(ROBLOSECURITY);

            const placePath = options.place;
            const versionNumber = placePath ? await uploadPlace(context, placePath) : null;
            exitCode = await runCloudLuau({
                executionKey: context.apiKey,
                universeId: context.universeId,
                placeId: context.placeId,
                versionNumber,
                scriptContents,
                outputWriter,
                silent: Boolean(options.silent),
            });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        record(message, "error");
        console.error(message);
        exitCode = 1;
    } finally {
        if (outputWriter) {
            try {
                await outputWriter.close();
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`Failed to close output file: ${message}`);
            }
        }
        if (options.exit === false) {
            return exitCode;
        }
        process.exit(exitCode);
    }
}
