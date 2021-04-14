import { BrowserWindow, Menu, shell } from 'electron';

import Presets from "@/lib/Presets";
import { setupDevices } from "@/lib/MIDIdevices";
import logger from "@/lib/gui/Logger";

(async function () {
  await setupDevices();
}());

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
    label: "Ac&tions",
    submenu: [
      {
        label: "&Clear Canvases",
        click: () => BrowserWindow.getFocusedWindow().webContents.send('clear-canvases')
      },
      {
        label: "Show &MIDI File",
        click: () => shell.showItemInFolder(this.midiFilePath),
      },
    ],
  },

  {
    label: "Re&generate",
    click: () => BrowserWindow.getFocusedWindow().webContents.send('generate')
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
