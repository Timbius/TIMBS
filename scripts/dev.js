const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

function run(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed: ${error.message}`);
  });

  return child;
}

const api = run("app", "npm", ["run", "start"], path.join(root, "backend"));

function shutdown() {
  if (!api.killed) api.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("Dev started in this terminal:");
console.log("APP: http://localhost:3000");
console.log("API: http://localhost:3000/api/health");
