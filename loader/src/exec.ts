import execa from "execa";

export async function execCommandPossiblyWsl(
  command: string,
  commandArgs: string[],
  { cwd, forceWsl = false }: { cwd: string; forceWsl?: boolean }
) {
  const conventionalProcess = await execa(command, commandArgs, {
    cwd,
    reject: false,
  });
  if (
    forceWsl ||
    (conventionalProcess.failed && process.platform === "win32")
  ) {
    // Attempt WSL command but fallback to conventional command if it fails.
    const wslProcess = await execa(
      "wsl",
      wslCommandArgs(command, commandArgs),
      {
        cwd,
        reject: false,
      }
    );
    if (!forceWsl && (wslProcess.failed || wslProcess.exitCode !== 0)) {
      console.warn("WSL command failed as well.");
    } else {
      return {
        wsl: true,
        process: wslProcess,
      };
    }
  }
  return {
    wsl: false,
    process: conventionalProcess,
  };
}

export function execCommand(
  command: string,
  commandArgs: string[],
  {
    wsl,
    longRunning,
    ...options
  }: execa.Options & { wsl: boolean; longRunning?: boolean }
) {
  return execa(
    wsl ? "wsl" : command,
    wsl ? wslCommandArgs(command, commandArgs, longRunning) : commandArgs,
    {
      ...options,
    }
  );
}

function wslCommandArgs(
  command: string,
  commandArgs: string[],
  longRunning = false
) {
  return [
    ...(longRunning ? ["nohup"] : []),
    "bash",
    "-lic",
    [command, ...commandArgs, ...(longRunning ? ["&"] : [])].join(" "),
  ];
}
