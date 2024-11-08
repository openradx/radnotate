import {app, BrowserWindow, ipcMain, dialog} from 'electron'
import installExtension, {REACT_DEVELOPER_TOOLS} from 'electron-devtools-installer';
import path from "path";

let mainWindow: BrowserWindow | null

declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

if (require('electron-squirrel-startup')) app.quit();

function createWindow() {
    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, "assets/icon"),
        backgroundColor: '#f0f0f0',
        title: "Radnotate",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
        }
    })
    //mainWindow.setMenu(null)
    console.log(__dirname)
    mainWindow.maximize()
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)

    mainWindow.on('close', (e) => {
        e.preventDefault()
        if (process.platform !== 'darwin') {
            dialog.showMessageBox({
                title: "Possible data loss",
                message: "If you close the window, your annotation data will be lost. Be sure to export your " +
                    "annotation data before you proceed. Always export your annotations as CSV. Are you sure you want to proceed?",
                buttons: ["Cancel", "Yes"]
            }).then(result => {
                if (result.response === 1) {
                    mainWindow?.destroy()
                }
            })
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

async function registerListeners() {
    /**
     * This comes from bridge integration, check bridge.ts
     */
    ipcMain.on('message', (_, message) => {
        console.log(message)
    })
}

app.on('ready', createWindow)
    .whenReady()
    .then(registerListeners)
    .catch(e => console.error(e))

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    installExtension(REACT_DEVELOPER_TOOLS)
        .then((name) => console.log(`Added Extension:  ${name}`))
        .catch((err) => console.log('An error occurred: ', err));
});
