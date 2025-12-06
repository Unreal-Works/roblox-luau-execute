import axios from "axios";
import fs from "fs";

async function createTask({ executionKey, universeId, placeId, scriptContents, placeVersion }) {
    const baseUrl = `https://apis.roblox.com/cloud/v2/universes/${universeId}/places/${placeId}`;
    const url = placeVersion
        ? `${baseUrl}/versions/${placeVersion}/luau-execution-session-tasks`
        : `${baseUrl}/luau-execution-session-tasks`;

    const response = await axios({
        method: "post",
        url,
        data: {
            script: scriptContents,
            timeout: "60s",
        },
        headers: {
            "x-api-key": executionKey,
            "Content-Type": "application/json",
        },
    });

    return response.data;
}

async function pollForTaskCompletion({ executionKey, taskPath }) {
    let task = null;

    while (!task || (task.state !== "COMPLETE" && task.state !== "FAILED")) {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const response = await axios.get(`https://apis.roblox.com/cloud/v2/${taskPath}`, {
            headers: {
                "x-api-key": executionKey,
            },
        });

        task = response.data;
    }

    if (typeof process?.stdout?.write === "function") {
        process.stdout.write("\r" + " ".repeat(80) + "\r");
    }

    return task;
}

async function getTaskLogs({ executionKey, taskPath }) {
    const response = await axios.get(`https://apis.roblox.com/cloud/v2/${taskPath}/logs`, {
        headers: {
            "x-api-key": executionKey,
        },
    });

    return response.data;
}

function analyzeTaskLogs(logs, outputWriter, silent) {
    const groups = logs?.luauExecutionSessionTaskLogs;
    if (!Array.isArray(groups)) {
        return;
    }

    for (const entry of groups) {
        if (!entry || !Array.isArray(entry.messages)) {
            continue;
        }

        for (const raw of entry.messages) {
            const text = typeof raw === "string" ? raw : JSON.stringify(raw);
            if (outputWriter) {
                outputWriter.write(text, "info");
            }
            if (!silent) {
                console.log(text);
            }
        }
    }
}

export async function runCloudLuau({
    executionKey,
    universeId,
    placeId,
    placeVersion,
    scriptContents,
    outputWriter,
    silent = false,
}) {
    const headersDefaults = (axios.defaults.headers ||= {});
    const commonHeaders = (headersDefaults.common ||= {});
    if (!commonHeaders["User-Agent"]) {
        commonHeaders["User-Agent"] = "Node.js/RobloxLuauExecute";
    }

    const task = await createTask({
        executionKey,
        universeId,
        placeId,
        scriptContents,
        placeVersion,
    });

    const completedTask = await pollForTaskCompletion({
        executionKey,
        taskPath: task.path,
    });

    const parsedExitCode = completedTask.output?.results?.[0];

    const logs = await getTaskLogs({
        executionKey,
        taskPath: task.path,
    });

    analyzeTaskLogs(logs, outputWriter, silent);

    if (completedTask.state === "COMPLETE") {
        return parsedExitCode || 0;
    }

    const errorCode = completedTask.error?.code ?? "UNKNOWN";
    const errorMessage = completedTask.error?.message ?? "Luau task failed";
    const combined = `${errorCode} ${errorMessage}`;
    console.error(combined);
    if (outputWriter) {
        outputWriter.write(combined, "error");
    }

    const fallbackMessage = "Luau task failed";
    console.error(fallbackMessage);
    if (outputWriter) {
        outputWriter.write(fallbackMessage, "error");
    }
    return 1;
}

export async function uploadPlace(context, placeFilePath) {
    const placeFileBuffer = fs.readFileSync(placeFilePath);
    const response = await axios({
        method: "post",
        url: `https://apis.roblox.com/universes/v1/${context.universeId}/places/${context.placeId}/versions?versionType=Saved`,
        data: placeFileBuffer,
        headers: {
            "x-api-key": context.apiKey,
            "Content-Type": "application/octet-stream",
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });
    return response.data.versionNumber;
}
