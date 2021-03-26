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

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

export default menu;

