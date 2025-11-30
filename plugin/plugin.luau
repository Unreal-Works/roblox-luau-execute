local HttpService = game:GetService("HttpService")
local LogService = game:GetService("LogService")

local ws_client = HttpService:CreateWebStreamClient(Enum.WebStreamClientType.WebSocket, {
    Url = "ws://localhost:7777"
})

-- Track log messages to send back to the server
local logConnection

-- Function to send JSON message to server
local function sendMessage(messageType, data)
    local payload = { type = messageType }
    for key, value in pairs(data) do
        payload[key] = value
    end
    ws_client:Send(HttpService:JSONEncode(payload))
end

-- Function to execute Luau code and capture output
local function executeLuau(script)
    -- Connect to LogService to capture output
    logConnection = LogService.MessageOut:Connect(function(message, messageType)
        sendMessage("output", {
            message = message,
            messageType = tostring(messageType)
        })
    end)

    -- Execute the script and capture return value
    local exitCode = 0
    local success, result = pcall(function()
        local fn, loadErr = loadstring(script)
        if not fn then
            error("Failed to load script: " .. tostring(loadErr))
        end
        return fn()
    end)

    -- Small delay to ensure all output is captured
    task.wait(0.1)

    -- Disconnect log listener
    if logConnection then
        logConnection:Disconnect()
        logConnection = nil
    end

    if success then
        -- Use the returned value as exit code if it's a number
        if type(result) == "number" then
            exitCode = result
        end
        sendMessage("complete", { exitCode = exitCode })
    else
        sendMessage("error", { message = tostring(result) })
    end
end

ws_client.MessageReceived:Connect(function(message)
    local success, data = pcall(function()
        return HttpService:JSONDecode(message)
    end)

    if not success then
        warn("Failed to decode message: " .. message)
        return
    end

    if data.type == "execute" then
        -- Execute the received Luau script
        executeLuau(data.script)
    end
end)

-- Notify server that plugin is ready
sendMessage("ready", {})