import chalk from "chalk";
import { execSync, spawn } from "child_process";
import fs from "fs";
import { windowManager } from "node-window-manager";
import os from "os";
import path from "path";
import { WebSocketServer } from "ws";

/**
 * @typedef {Object} PlaceRunnerOptions
 * @property {string} scriptContents - The Luau script contents to execute
 * @property {string} [script] - Path to the original script file (for reference)
 * @property {string} [place] - Path to a .rbxl place file
 * @property {boolean} [oneshot] - Exit after first instance disconnects
 * @property {boolean} [noLaunch] - Don't launch Studio (manage lifecycle externally)
 * @property {boolean} [noExit] - Keep Studio running after program exits
 */

/**
 * Locate Roblox Studio installation
 * @returns {{ applicationPath: string, pluginsPath: string } | null}
 */
function locateRobloxStudio() {
    const platform = os.platform();

    if (platform === "win32") {
        // Windows: Check LocalAppData for Roblox Studio
        const localAppData = process.env.LOCALAPPDATA;
        if (!localAppData) return null;

        const versionsPath = path.join(localAppData, "Roblox", "Versions");
        if (!fs.existsSync(versionsPath)) return null;

        // Find the Studio version folder
        const versions = fs.readdirSync(versionsPath);
        for (const version of versions) {
            const studioPath = path.join(versionsPath, version, "RobloxStudioBeta.exe");
            if (fs.existsSync(studioPath)) {
                const pluginsPath = path.join(localAppData, "Roblox", "Plugins");
                return { applicationPath: studioPath, pluginsPath };
            }
        }
        return null;
    } else if (platform === "darwin") {
        // macOS
        const studioPath = "/Applications/RobloxStudio.app/Contents/MacOS/RobloxStudio";
        if (fs.existsSync(studioPath)) {
            const pluginsPath = path.join(os.homedir(), "Documents", "Roblox", "Plugins");
            return { applicationPath: studioPath, pluginsPath };
        }
        return null;
    }

    return null;
}

export class PlaceRunner {
    /**
     * @param {PlaceRunnerOptions} options
     */
    constructor(options) {
        this.options = options;
        this.port = 7777;
        /** @type {import("child_process").ChildProcess | null} */
        this.studioProcess = null;
        /** @type {{ applicationPath: string, pluginsPath: string } | null} */
        this.studioInstall = null;
        this.minimizeInterval = null;
        this.exitCode = 0;
        this.isRunning = false;
    }

    /**
     * Get the Roblox Studio installation
     */
    getStudioInstall() {
        if (!this.studioInstall) {
            this.studioInstall = locateRobloxStudio();
            if (!this.studioInstall) {
                throw new Error("Could not locate a Roblox Studio installation.");
            }
        }
        return this.studioInstall;
    }

    /**
     * Install the plugin to Roblox Studio plugins folder
     */
    installPlugin() {
        const studioInstall = this.getStudioInstall();

        const pluginDir = path.join(
            path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
            "..",
            "plugin",
        );

        const getPluginData = () => {
            const pluginPath = path.join(pluginDir, "plugin.rbxm");
            if (fs.existsSync(pluginPath)) {
                return fs.readFileSync(pluginPath);
            }
        };

        let pluginData = getPluginData();
        if (!pluginData) {
            // Cold start; run build step
            execSync("npx lune run build.lua", { stdio: "inherit", cwd: pluginDir });
            pluginData = getPluginData();
            if (!pluginData) throw new Error("Could not open plugin file - did you build it with `lune`?");
        }

        // Create plugins directory if it doesn't exist
        if (!fs.existsSync(studioInstall.pluginsPath)) {
            fs.mkdirSync(studioInstall.pluginsPath, { recursive: true });
        }

        const pluginFilePath = path.join(studioInstall.pluginsPath, "rbxluau.rbxm");
        fs.writeFileSync(pluginFilePath, pluginData);
    }

    /**
     * Remove the plugin from Roblox Studio plugins folder
     */
    removePlugin() {
        const studioInstall = this.getStudioInstall();
        const pluginFilePath = path.join(studioInstall.pluginsPath, "rbxluau.rbxm");

        if (fs.existsSync(pluginFilePath)) {
            fs.unlinkSync(pluginFilePath);
        }
    }

    /**
     * Get Studio launch arguments
     * @returns {string[]}
     */
    getStudioArgs() {
        let placePath = path.join(
            path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
            "..",
            "plugin",
            "empty_place.rbxl",
        );
        if (this.options.place) {
            placePath = path.resolve(this.options.place);
        }

        if (!fs.existsSync(placePath)) {
            throw new Error(`Place file does not exist at path: ${placePath}`);
        }

        return [placePath];
    }

    /**
     * Stop the runner
     */
    async stop() {
        this.isRunning = false;

        if (this.minimizeInterval) {
            clearInterval(this.minimizeInterval);
            this.minimizeInterval = null;
        }

        if (this.wss) {
            this.wss.close();
        }

        if (this.studioProcess && !this.options.noExit) {
            this.studioProcess.kill();
        }

        try {
            this.removePlugin();
        } catch (err) {
            // Ignore errors when removing plugin
        }
    }

    /**
     * Run the place runner
     * @returns {Promise<number>} Exit code
     */
    async run() {
        this.isRunning = true;

        try {
            this.installPlugin();
        } catch (err) {
            console.error(`Failed to install plugin: ${err.message}`);
            return 1;
        }

        const studioInstall = this.getStudioInstall();
        const studioArgs = this.getStudioArgs();

        // Start a WebSocket server
        this.wss = new WebSocketServer({ port: this.port });

        /** @type {import("ws").WebSocket | null} */
        let studioSocket = null;
        let resolveStart = null;
        let resolveComplete = null;

        this.wss.on("connection", (ws) => {
            studioSocket = ws;

            // Send the script to execute
            ws.send(
                JSON.stringify({
                    type: "execute",
                    script: this.options.scriptContents || "",
                }),
            );

            ws.on("message", (data) => {
                try {
                    const message = JSON.parse(data.toString());

                    if (message.type === "ready") {
                        // Plugin is ready, resolve the start promise
                        if (resolveStart) resolveStart(true);
                    } else if (message.type === "output") {
                        let output;
                        if (message.messageType === "Enum.MessageType.MessageWarning") {
                            output = chalk.yellow(message.message);
                        } else if (message.messageType === "Enum.MessageType.MessageError") {
                            output = chalk.red(message.message);
                        } else {
                            output = message.message;
                        }
                        console.log(output);
                    } else if (message.type === "complete") {
                        // Execution complete
                        this.exitCode = message.exitCode || 0;
                        if (resolveComplete) resolveComplete();
                        this.stop();
                    } else if (message.type === "error") {
                        console.error(`Execution error: ${message.message}`);
                        this.exitCode = 1;
                        if (resolveComplete) resolveComplete();
                        this.stop();
                    }
                } catch (err) {
                    console.error(`Failed to parse message: ${err.message}`);
                }
            });

            ws.on("close", () => {
                studioSocket = null;
                if (this.options.oneshot) {
                    this.stop();
                }
            });
        });

        // Launch Studio if not in no-launch mode
        if (!this.options.noLaunch) {
            this.studioProcess = spawn(studioInstall.applicationPath, studioArgs, {
                stdio: "ignore",
                detached: this.options.noExit,
            });

            this.minimizeInterval = setInterval(() => {
                for (const window of windowManager.getWindows()) {
                    if (window.processId === this.studioProcess.pid) {
                        window.hide();
                        break;
                    }
                }
            }, 50);

            if (this.options.noExit) {
                this.studioProcess.unref();
            }

            this.studioProcess.on("error", (err) => {
                console.error(`Failed to launch Studio: ${err.message}`);
            });

            this.studioProcess.on("exit", () => {
                if (this.isRunning) {
                    this.stop();
                }
            });

            const startPromise = new Promise((resolve) => {
                resolveStart = resolve;
            });

            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve(null), 30000);
            });

            const result = await Promise.race([startPromise, timeoutPromise]);

            if (!result) {
                console.error("Caught a timeout while waiting for a studio instance to start - do you need to login?");
                await this.stop();
                return 1;
            }
        }

        // Wait for exit signal
        await new Promise((resolve) => {
            const cleanup = () => this.stop().then(resolve);

            process.on("SIGINT", cleanup);
            process.on("SIGTERM", cleanup);

            // Keep running until stopped
            const checkInterval = setInterval(() => {
                if (!this.isRunning) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });

        return this.exitCode;
    }
}
