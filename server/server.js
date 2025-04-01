#!/usr/bin/env node

import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import util from "node:util";
import {
  spawn,
  exec as execCallback,
  execFile as execFileCallback,
} from "node:child_process";
const exec = util.promisify(execCallback);
const execFile = util.promisify(execFileCallback);
import morgan from "morgan";
import winston from "winston";
import debounce from "./debounce-async.js";
import { showRofiDialog, getElemOfNonEmptyArray, loadOptions } from "./utils.js"
import { translateSrt } from "./translate-with-cache.js"

function main() {
  const lines = loadOptions();
  translateSrt({ strDataArray: lines, languageFrom: 'ru', languageTo: 'en' });
}
main()

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({
      format: "YYYY-MM-DD hh:mm:ss.SSS A",
    }),
    winston.format.align(),
    winston.format.printf((info) => {
      const reqId = info.requestId ? `[${info.requestId}] ` : "";
      return `[${info.timestamp}] ${info.level}: ${info.path} ${reqId}${info.message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});




function notifySend(text) {
  // execFile("notify-send", [text]);
}

function getlineIndex(index) {
  const lines = loadOptions();
  return getElemOfNonEmptyArray(lines, index);
}

let state = {
  autoplaying: false,
  lastReadLineIndex: 0,
  currentAudioProcess: null,
};

const generateMp3Path = (lineText) => {
  const hash = crypto.createHash("sha256").update(lineText).digest("hex");
  return path.join(process.env.HOME, "Documents/rofi-audio", `${hash}.mp3`);
};

function mplayer(reqLogger, mp3File) {
  if (state.currentAudioProcess) {
    reqLogger.info("Killing existing mplayer process");
    state.currentAudioProcess.kill();
  }

  return new Promise(function (resolve, reject) {
    const program = "mplayer";
    const opts = [
      "-speed",
      "1.4",
      "-af",
      "scaletempo",
      "-volume",
      "40",
      mp3File,
    ];
    reqLogger.info([program, ...opts].join(" "));
    const childProcess = spawn(program, opts, {
      stdio: ["ignore", "ignore", "ignore"],
    });
    state.currentAudioProcess = childProcess;

    childProcess.on("error", (err) => {
      reqLogger.error(
        `mplayer error: ${err}, pid: ${state.currentAudioProcess?.pid}`,
      );
      if (state.currentAudioProcess === childProcess) {
        state.currentAudioProcess = null;
      }
      reject(err);
    });

    childProcess.on("close", (code) => {
      reqLogger.info(
        `mplayer close: code ${code}, pid: ${state.currentAudioProcess?.pid}`,
      );
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
      reqLogger.info(
        `mplayer exit: code: ${code}, signal: ${signal}, pid: ${state.currentAudioProcess?.pid}`,
      );
      if (state.currentAudioProcess === childProcess) {
        state.currentAudioProcess = null;
      }
    });
  });
}

async function playAudio(reqLogger, lineIndex) {
  reqLogger.info(`playAudio called with lineIndex: ${lineIndex}`);
  if (!Number.isInteger(lineIndex)) {
    throw new Error(`No line index ${lineIndex}`);
  }
  const lineText = getlineIndex(lineIndex);
  if (!lineText) {
    throw new Error(`No text found for line number ${lineIndex}`);
  }

  const mp3File = generateMp3Path(lineText);

  try {
    await fs.promises.access(mp3File);
  } catch {
    reqLogger.info("MP3 file does not exist, generating...", mp3File);
    await execFile("gtts-cli", [lineText, "-l", "ru", "-o", mp3File]);
  }

  reqLogger.info(`Playing: lineText: ${lineText}, mp3File: ${mp3File}`);
  notifySend(`${lineIndex}: ${lineText}`);

  state.lastReadLineIndex = lineIndex;

  return mplayer(reqLogger, mp3File);
}

const app = express();

const reqIdCounters = {};
app.use((req, _res, next) => {
  const path = req.path;
  if (!reqIdCounters[path]) {
    reqIdCounters[path] = 0;
  }
  req.reqLogger = logger.child({ path, requestId: reqIdCounters[path]++ });
  req.reqLogger.warn(req.path);
  next();
});

const morganMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  },
);

app.use(morganMiddleware);

app.get("/next", async (req, res) => {
  const reqLogger = req.reqLogger;
  res.send("Playing next line");
  await playAudio(reqLogger, state.lastReadLineIndex + 1);
});

app.get("/prev", async (req, res) => {
  const reqLogger = req.reqLogger;
  res.send("Playing previous line");
  await playAudio(reqLogger, state.lastReadLineIndex - 1);
});

app.get("/stop", async (_req, res) => {
  startAutoplay_debounced.stop();
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  state = {
    autoplaying: false,
    lastReadLineIndex: state.lastReadLineIndex,
    currentAudioProcess: null,
  };
  res.send("Stopped audio");
  notifySend("/stop");
});

// Example usage:
async function startAutoplay(reqLogger) {
  try {
    if (state.currentAudioProcess) {
      state.currentAudioProcess.kill();
    }
    state = {
      autoplaying: true,
      lastReadLineIndex: 0,
      currentAudioProcess: null,
    };
    while (state.autoplaying) {
      reqLogger.info(
        `autoplaying_start while 1, autoplaying: ${state.autoplaying}, pid: ${state.currentAudioProcess && state.currentAudioProcess.pid}`,
      );
      if (!state.autoplaying) break; // autoplay_stop was called
      reqLogger.info(
        `autoplaying_start while 2, autoplaying: ${state.autoplaying}, pid: ${state.currentAudioProcess && state.currentAudioProcess.pid}`,
      );
      await playAudio(reqLogger, state.lastReadLineIndex);
      reqLogger.info(
        `autoplaying_start while 3, autoplaying: ${state.autoplaying}, pid: ${state.currentAudioProcess && state.currentAudioProcess.pid}`,
      );
      while (state.currentAudioProcess) {
        reqLogger.warn(`state.currentAudioProcess, waiting`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (state.currentAudioProcess) {
          state.currentAudioProcess.kill();
        }
      }
      if (state.currentAudioProcess) {
        throw new Error("audio process still running");
      }
      // await new Promise((resolve) => setTimeout(resolve, 1000));
      reqLogger.info(
        `autoplaying_start while 4, autoplaying: ${state.autoplaying}, pid: ${state.currentAudioProcess && state.currentAudioProcess.pid}`,
      );
      if (!state.autoplaying) break; // autoplay_stop was called
      reqLogger.info(
        `autoplaying_start while 5, autoplaying: ${state.autoplaying}, pid: ${state.currentAudioProcess && state.currentAudioProcess.pid}`,
      );
      state.lastReadLineIndex = state.lastReadLineIndex + 1;
    }
  } catch (error) {
    reqLogger.error("Error in autoplay:", error);
    state.autoplaying = false;
    throw error;
  }
}

const startAutoplay_debounced = debounce(startAutoplay, 3000);

app.get("/autoplay_start", async (req, res) => {
  const reqLogger = req.reqLogger;
  if (state.autoplaying) {
    return res.send("Autoplay already started");
  }
  res.send("Autoplay started");
  startAutoplay_debounced(reqLogger).then(reqLogger.debug).catch(reqLogger.error);
});

app.get("/autoplay_stop", async (_req, res) => {
  startAutoplay_debounced.stop();
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  state = {
    autoplaying: false,
    lastReadLineIndex: 0,
    currentAudioProcess: null,
  };
  res.send("Autoplay stopped");
  notifySend("/autoplay_stop");
});

app.get("/choose/:line", async (req, res) => {
  const reqLogger = req.reqLogger;
  const lineNumber = parseInt(req.params.line, 10);
  await playAudio(reqLogger, lineNumber - 1);
  res.send(`Playing chosen line ${lineNumber}`);
});

app.get("/rofi", async (req, res) => {
  const reqLogger = req.reqLogger;
  const lineIndex = await showRofiDialog(reqLogger);
  if (!lineIndex) {
    res.send(`Rofi: no selection`);
    return;
  }
  reqLogger.info(`lineIndex ${lineIndex}`);
  if (state.currentAudioProcess) {
    state.currentAudioProcess.kill();
  }
  res.send(`Rofi: selected ${lineIndex}`);
  await playAudio(reqLogger, lineIndex);
});

const port = process.env.PORT || 3300;
app.listen(port, () => logger.info(`Server running on port ${port}`));
