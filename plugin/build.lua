local fs = require("@lune/fs")
local roblox = require("@lune/roblox")

-- Create the plugin instance
local plugin = roblox.Instance.new("Script")
plugin.Name = "rbxluau"
plugin.Source = fs.readFile("./plugin.luau")
fs.writeFile("./plugin.rbxm", roblox.serializeModel({plugin}))

-- Create empty place file
fs.writeFile("./empty_place.rbxl", roblox.serializePlace(roblox.Instance.new("DataModel")))