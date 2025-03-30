#!/usr/bin/env node

import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import util from "node:util";
import {
  spawn,
  exec as execCallback,
  execFileSync,
  execFile as execFileCallback,
} from "node:child_process";
const exec = util.promisify(execCallback);
const execFile = util.promisify(execFileCallback);

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptDir = __dirname;
const optionsFile = path.join(scriptDir, "rofi-audio.txt");
const lines = fs
  .readFileSync(optionsFile, "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => !!line);
if (!lines.length) throw Error("no lines loaded");

// console.log(lines);
const state = {
  autoplaying: false,
  lastReadLine: 0,
  currentAudioProcess: null,
};

const generateMp3Path = (lineText) => {
  const hash = crypto.createHash("sha256").update(lineText).digest("hex");
  return path.join(process.env.HOME, "Documents/rofi-audio", `${hash}.mp3`);
};

const playAudio = async (lineNumber) => {
  console.log("playAudio called with lineNumber:", lineNumber);
  const lineText = lines[lineNumber - 1];
  if (!lineText) {
    throw new Error(`No text found for line number ${lineNumber}`);
  }

  const mp3File = generateMp3Path(lineText);
  console.log("Generated mp3 path:", mp3File);

  try {
    await fs.promises.access(mp3File);
  } catch {
    console.log("MP3 file does not exist, generating...");
    await execFile("gtts-cli", [lineText, "-l", "ru", "-o", mp3File]);
  }

  console.log(`Playing: ${lineText}`);
  await execFile("notify-send", [`${lineNumber}: ${lineText}`]);

  state.lastReadLine = lineNumber;

  return new Promise((resolve, reject) => {
    const childProcess = spawn("mplayer", [mp3File], {
      stdio: ["ignore", process.stdout, process.stdout],
    });
    state.currentAudioProcess = childProcess;

    childProcess.on("error", (err) => {
      state.currentAudioProcess = null;
      reject(err);
    });

    childProcess.on("close", (code) => {
      if (state.currentAudioProcess === childProcess) {
        state.currentAudioProcess = null;
      }
      if (code === 0 || code === null || code === 1) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    childProcess.on("exit", (code, signal) => {
      if (signal === "SIGTERM") {
        resolve();
      }
    });
  });
};

const app = express();

app.get("/next", async (_req, res) => {
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  await playAudio(state.lastReadLine + 1);
  res.send("Playing next line");
});

app.get("/prev", async (_req, res) => {
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  await playAudio(state.lastReadLine - 1);
  res.send("Playing previous line");
});

app.get("/stop", (_req, res) => {
  state.autoplaying = false;
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  res.send("Stopped audio");
});

app.get("/autoplay_start", async (_req, res) => {
  if (!state.autoplaying) {
    state.autoplaying = true;
    while (state.autoplaying) {
      if (state.currentAudioProcess) {
        state.currentAudioProcess.kill();
      }
      await playAudio(state.lastReadLine + 1);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  res.send("Autoplay started");
});

app.get("/autoplay_stop", (_req, res) => {
  state.autoplaying = false;
  res.send("Autoplay stopped");
});

app.get("/choose/:line", async (req, res) => {
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  console.log("Playing ", req.params);
  const lineNumber = parseInt(req.params.line, 10);
  await playAudio(lineNumber);
  res.send(`Playing chosen line ${lineNumber}`);
});

async function showRofiDialog_() {
  try {
    const inputText = lines
      .map((line, index) => `${index + 1}: ${line}`)
      .join("\n");
    return execFileSync("rofi", ["-dmenu", "-p", "Play"], {
      input: inputText,
      encoding: "utf-8",
    });
  } catch (err) {
    if (err.code === 1) {
      throw new Error("No selection made: code 1");
    }
    throw err;
  }
  // const { stdout } = await execFile("rofi", ["-dmenu", "-p", "Play"], {
  //   encoding: "utf-8",
  //   input: Buffer.from(inputText),
  // });
}

async function showRofiDialog() {
  const stdout = await showRofiDialog_();
  const chosen = stdout.trim();
  if (!chosen) {
    throw new Error("No selection made");
  }
  const lineNumberString = chosen.split(":")[0].trim();
  return parseInt(lineNumberString, 10);
}

app.get("/rofi", async (_req, res) => {
  const lineNumber = await showRofiDialog();
  console.log("lineNumber", lineNumber);
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  await playAudio(lineNumber);
  res.send(`Playing rofi selection: ${lineNumber}`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
