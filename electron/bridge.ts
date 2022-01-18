import { contextBridge, ipcRenderer } from 'electron'
import MedImgReader from "med-img-reader";
import fs from "fs";
export const api = {
  /**
   * Here you can expose functions to the renderer process
   * so they can interact with the main (electron) side
   * without security problems.
   *
   * The function below can accessed using `window.Main.sendMessage`
   */

  sendMessage: (message: string) => {
    ipcRenderer.send('message', message)
  },

  /**
   * Provide an easier way to listen to events
   */
  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
  }
}


export const test = {
  newobj: (image, filename) => {
    console.log("awa1")
    const medImgWriter = new MedImgReader();
    medImgWriter.SetInput(image);
    medImgWriter.SetFilename(filename);
    medImgWriter.WriteImage();
    fs.writeFile("/home/manuel/awa.txt", "Hi", ()=>{})
    console.log("awa2")
  }
}

contextBridge.exposeInMainWorld('Main', api)
contextBridge.exposeInMainWorld('test', test)