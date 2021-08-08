const { ipcMain } = require("electron")
const winston = require("winston")

const gi = require("node-gtk")
let LightDM = gi.require("LightDM", "1")

const { window } = require("./globals.js")

const bridge = require("./bridge.js")

// 2021-08-05 12:12:57 [ DEBUG ] application - application.py:66 : run | Setting window size and position

const myFormat = winston.format.printf(({ level, message, sourceID, line, timestamp }) => {
  return `${timestamp} [ ${level.toLocaleUpperCase()} ] ${sourceID} ${line}: ${message}`;
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
    myFormat
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console(),
  ],
});

window.whenReady().then(() => {
  initLogger()
})

function initLogger() {
  window.win.webContents.addListener("console-message", (ev, code, message, line, sourceID) => {
    if (code == 3) {
      logger.log({ level: "error", message: message, line: line, sourceID: sourceID })
    } else
    if (code == 2) {
      logger.log({ level: "warn", message: message, line: line, sourceID: sourceID })
    }
  })
}

ipcMain.on("LightDM", (event, args) => {
  if (args == "suspend") {
    LightDM.suspend()
  }
  console.log(args)
})
