export = () => {
	let i = 0;
	const heartbeat = game.GetService("RunService").Heartbeat.Connect(() => {
		i += 1;
		print(i);
	});

	task.wait(2);
	print(`We waited 2 seconds, or ${i} heartbeats!`);
	heartbeat.Disconnect();
	return i;
};
