import { BrowserWindow, Menu, shell } from 'electron';

import Presets from "@/lib/Presets";
import logger from "@/lib/gui/Logger";

const template = [
  {
    label: "&File",
    submenu: [
      {
        label: "&Load Preset",
        submenu: Presets.map((preset, index) => {
          const acc = index < 9;
          return {
            type: "radio",
            label: (acc ? "&" : "") + (index + 1) + " " + preset.title,
            accelerator: acc ? index + 1 : undefined,
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
    label: "&Clear Canvases",
    click: () => BrowserWindow.getFocusedWindow().webContents.send('clear-canvases')
  },

  {
    label: "Re&generate",
    submenu: [
      {
        label: "&All",
        click: () => BrowserWindow.getFocusedWindow().webContents.send('generate-all')
      },
      {
        label: "&MIDI",
        click: () => BrowserWindow.getFocusedWindow().webContents.send('generate-midi')
      },
    ]
  },

  {
    label: "&MIDI",
    submenu: [
      {
        label: "▶ &Play",
        click: () => BrowserWindow.getFocusedWindow().webContents.send('midi-play')
      },
      {
        label: "❚❚ &Pause",
        click: () => BrowserWindow.getFocusedWindow().webContents.send('midi-pause')
      },
      {
        label: "■ &Stop",
        click: () => BrowserWindow.getFocusedWindow().webContents.send('midi-stop')
      },
      {
        label: "⟳ &Regenerate",
        click: () => BrowserWindow.getFocusedWindow().webContents.send('generate-midi')
      },
      { role: "separator" },
      {
        label: "Show &MIDI File",
        click: () => shell.showItemInFolder(this.midiFilePath),
      },
    ]
  },

  {
    label: "&Help",
    submenu: [
      {
        label: "Show &Log",
        click: () => shell.showItemInFolder(logger.path),
      },
      {
        role: "toggleDevTools",
      },
      {
        label: "&Support",
        click: () => shell.openExternalSync("https://lee.goddards.space"),
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
    popup.on('page-title-updated', (e) => e.preventDefault());
    popup.once("ready-to-show", () => popup.show());
    popup.loadURL(canvasData);
    popup.setMenu(null);
    popup.maximize();
  });

}

export const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

export default menu;
