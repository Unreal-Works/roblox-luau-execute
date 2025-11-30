# Roblox Luau Execute

A Node.js project for executing Luau scripts, designed for use with Roblox development workflows. This project provides tools and utilities to run and manage Luau scripts programmatically.

## Setup

Local Execution:
1. Install roblox-luau-execute via npm:

   ```sh
   npm install rbxluau
   ```
2. Ensure you have [Roblox Studio](https://create.roblox.com/docs/tutorials/curriculums/studio/install-studio) installed and opened at least once on your local machine.
3. Start using the package in your Node.js projects!

   ```sh
   npx rbxluau "print('Hello, Roblox!')"
   ```

Cloud Execution (CI/CD Pipelines, etc.):
1. [Create and log into a throwaway Roblox account to use for script execution.](https://www.roblox.com/) Ensure this account has no value and is not linked to any personal information.
2. [Disable account session protection](https://create.roblox.com/settings/advanced). This is necessary for the API to work correctly.
3. Obtain the `.ROBLOSECURITY` cookie value from your browser. This cookie is required for authentication when making API requests.
4. In your project directory, create a `.env` file and add the following line, replacing `your_roblosecurity_cookie` with your actual cookie value:

   ```env
   ROBLOSECURITY=your_roblosecurity_cookie
   ```
5. Install roblox-luau-execute via npm:

   ```sh
   npm install rbxluau
   ```
6. Start using the package in your Node.js projects!

   ```sh
   npx rbxluau "print('Hello, Roblox!')"
   ```

## Getting Started

### Prerequisites
- Node.js (v16 or later recommended)
- Roblox Studio (optional, for local execution)

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/roblox-luau-execute.git
   cd roblox-luau-execute
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

### Running a Luau Script
You can run a Luau script using the provided demo:

```sh
npx rbxluau --script demo/fibonacci.luau
```

Or run the demo TypeScript project:

```sh
npm run build
```

Your Luau script can return an exit code by returning a number at the end of the script. For example, returning `1` will set the process exit code to `1`.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
