const { app, BrowserWindow, ipcMain } = require('electron')
const { ipcRenderer } = require('electron/renderer')
const path = require("path")

let file = "/usr/share/web-greeter/themes/gruvbox/index.html"

class Browser {
  ready = false

  constructor() {
    app.whenReady().then(() => {
      this.create_window()
      this.init_listeners()
    })
  }

  whenReady() {
    return new Promise((resolve) => {
      let interval = setInterval(() => {
        if (this.ready) {
          resolve(); clearInterval(interval)
        }
      }, 100)
    })
  }

  create_window() {
    this.win = new BrowserWindow({
      //fullscreen: true,
      height: 720,
      width: 1120,
      backgroundColor: "#00000000",
      frame: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        //nodeIntegration: false,
        nodeIntegration: true,
        //contextIsolation: true,
        contextIsolation: false,
        //nodeIntegrationInWorker: true,
        allowRunningInsecureContent: false, // Should set option
        //devTools: false, // Should set option
      },
    })

    this.ready = true
    this.win.loadFile(file)
    this.win.maximize()
    this.win.focus()
  }

  init_listeners() {
  }

}

module.exports.Browser = Browser
