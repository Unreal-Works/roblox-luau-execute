-- Computes the nth Fibonacci number
function fibonacci(n)
	if n <= 0 then
		return 0
	elseif n == 1 then
		return 1
	else
		return fibonacci(n - 1) + fibonacci(n - 2)
	end
end

-- Print the first 10 Fibonacci numbers
for i = 0, 9 do
    local instance = Instance.new("Part")
    instance.Name = "FibonacciPart_" .. i
    instance.Size = Vector3.new(1, fibonacci(i), 1)
    instance.Position = Vector3.new(i * 2, fibonacci(i) / 2, 0)
    instance.Anchored = true

    instance.Parent = workspace
end

for i, v in pairs(workspace:GetChildren()) do
    if not v:IsA("Part") then
        continue
    end
    print(v.Name .. " has height " .. v.Size.Y)
end