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

function loadOptions() {
  const lines = fs
    .readFileSync(optionsFile, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !!line);
  if (!lines.length) throw Error("no lines loaded");

  return lines;
}

function getlineIndex(index) {
  const lines = loadOptions();
  return getElemOfNonEmptyArray(lines, index);
}

// from 1 to inf, if more then lenght - use %
function getElemOfNonEmptyArray(array, index) {
  if (index < 0) throw new Error("index must be positive");
  const length = array.length;
  if (length === 0) throw new Error("array must not be empty");
  if (index >= length) return array[length - 1];
  return array[index];
}

// getElemOfNonEmptyArray([], 0); // throw error
// getElemOfNonEmptyArray([1, 2, 3], 0); // 1
// getElemOfNonEmptyArray([1, 2, 3], 1); // 2
// getElemOfNonEmptyArray([1, 2, 3], 2); // 3
// getElemOfNonEmptyArray([1, 2, 3], 3); // 3
// getElemOfNonEmptyArray([1, "foo", 3], 4); // "foo"

const state = {
  autoplaying: false,
  lastReadLineIndex: 0,
  currentAudioProcess: null,
};

const generateMp3Path = (lineText) => {
  const hash = crypto.createHash("sha256").update(lineText).digest("hex");
  return path.join(process.env.HOME, "Documents/rofi-audio", `${hash}.mp3`);
};

const playAudio = async (lineIndex) => {
  console.log("playAudio called with lineIndex:", lineIndex);
  const lineText = getlineIndex(lineIndex);
  if (!lineText) {
    throw new Error(`No text found for line number ${lineIndex}`);
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
  await execFile("notify-send", [`${lineIndex}: ${lineText}`]);

  state.lastReadLineIndex = lineIndex;

  return new Promise((resolve, reject) => {
    const childProcess = spawn(
      "mplayer",
      ["-speed", "1.3", "-af", "scaletempo", mp3File],
      {
        stdio: ["ignore", process.stdout, process.stdout],
      },
    );
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

    childProcess.on("exit", (_code, signal) => {
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
  await playAudio(state.lastReadLineIndex + 1);
  res.send("Playing next line");
});

app.get("/prev", async (_req, res) => {
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  await playAudio(state.lastReadLineIndex - 1);
  res.send("Playing previous line");
});

app.get("/stop", (_req, res) => {
  state.autoplaying = false;
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  res.send("Stopped audio");
});

app.get("/autoplay_start", async (req, res) => {
  if (!state.autoplaying) {
    state.autoplaying = true;
    while (state.autoplaying) {
      if (state.currentAudioProcess) {
        state.currentAudioProcess.kill();
      }
      await new Promise((resolve) =>
        setTimeout(resolve, req.params.waitMilliseconds || 2000),
      );
      if (!state.autoplaying) break; // Check if stopped during wait
      await playAudio(state.lastReadLineIndex + 1);
      // await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  res.send("Autoplay started");
});

app.get("/autoplay_stop", async (_req, res) => {
  state.autoplaying = false;
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  state.lastReadLineIndex = 0;
  res.send("Autoplay stopped");
});

app.get("/choose/:line", async (req, res) => {
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  console.log("Playing ", req.params);
  const lineIndex = parseInt(req.params.line, 10);
  await playAudio(lineIndex);
  res.send(`Playing chosen line ${lineIndex}`);
});

async function showRofiDialog_() {
  try {
    const inputText = loadOptions()
      .map((line, index) => `${index + 1}: ${line}`)
      .join("\n");
    return execFileSync("rofi", ["-dmenu", "-p", "Play"], {
      input: inputText,
      encoding: "utf-8",
    });
  } catch (err) {
    if (err.status === 1) {
      console.log("No selection made: code 1");
      return null;
    }
    throw err;
  }
}

async function showRofiDialog() {
  const stdout = await showRofiDialog_();
  if (!stdout) {
    return null;
  }
  const chosen = stdout.trim();
  if (!chosen) {
    throw new Error("No selection made");
  }
  const lineIndexString = chosen.split(":")[0].trim();
  return parseInt(lineIndexString, 10);
}

app.get("/rofi", async (_req, res) => {
  const lineIndex = await showRofiDialog();
  if (!lineIndex) {
    return null;
  }
  console.log("lineIndex", lineIndex);
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  await playAudio(lineIndex);
  res.send(`Playing rofi selection: ${lineIndex}`);
});

const port = process.env.PORT || 3300;
app.listen(port, () => console.log(`Server running on port ${port}`));
