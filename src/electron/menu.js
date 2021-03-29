import { BrowserWindow, Menu } from 'electron';

import Presets from "@/lib/Presets";

const template = [
  {
    label: "&File",
    submenu: [
      {
        label: "&Load Preset",
        submenu: Presets.map((preset, index) => {
          return {
            type: "radio",
            label: index + 1 + " " + preset.title,
            accelerator: index <= 10 ? index + 1 : undefined,
            click: (e) => {
              e.checked = true;
              BrowserWindow.getFocusedWindow().webContents.send('load-preset', index);
            }
          };
        }),
      },
      { label: "P&references", click: () => BrowserWindow.getFocusedWindow().webContents.send('view-settings') },
      { role: "separator" },
      { role: "quit" },
    ],
  },

  {
    label: "Ac&tions",
    submenu: [
      { label: "&Clear Canvases", click: () => BrowserWindow.getFocusedWindow().webContents.send('clear-canvases') },
      {
        label: "Show &MIDI File",
        // click: () => electron.shell.showItemInFolder(this.midiFilePath),
      },
    ],
  },

  // { role: 'viewMenu' },

  {
    label: "&Help",
    submenu: [
      {
        label: "Show &Log",
        // click: () => electron.shell.showItemInFolder(this.logFilePath),
      },
      {
        role: "toggleDevTools",
      },
      {
        label: "&Support",
        // click: () => electron.shell.openExternalSync("https://lee.goddards.space"),
      },
    ],
  },
];

export function addMenuHandlers(ipcMain, win) {
  ipcMain.on('open-canvas-window', (_event, { canvasData, title, rules, totalGenerations }) => {
    const popup = new BrowserWindow({
      parent: win,
      show: false,
      titleBar: true,
      title: title + ' ' + totalGenerations + " generations of " + rules,
      backgroundColor: "#000000",
    });
    popup.on('page-title-updated', function (e) {
      e.preventDefault()
    });
    popup.loadURL(canvasData);
    popup.setMenu(null);
    popup.maximize();
    popup.once("ready-to-show", () => {
      popup.show();
    });
  });

  ipcMain.on('display-app-menu', ({ x, y }) => {
    if (win) {
      menu.popup({
        window: win,
        x, y
      });
    }
  });

  ipcMain.handle("max-unmax-window", () => {
    // isMaximized doesn't work for Windows.
    const pos = win.getPosition();
    const size = win.getSize();
    const isMaximized =
      pos[0] === 0 &&
      pos[1] === 0 &&
      size.outerWidth === window.outerWidth &&
      size.outerHeight === window.outerHeight;

    if (isMaximized) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on("unmaximize", () => {
    win.unmaximize();
  });

  ipcMain.on("close", () => {
    win.close();
  });

  ipcMain.on("maximize", () => {
    if (win.maximizable()) {
      win.maximize;
    }
  });

  ipcMain.on("minimize", () => {
    if (win.minimizable) {
      win.minimize();
    }
  });
}

export const menu = Menu.buildFromTemplate(template);

Menu.setApplicationMenu(menu);

export default menu;