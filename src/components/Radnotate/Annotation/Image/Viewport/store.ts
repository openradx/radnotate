import { setAutoFreeze, produceWithPatches, enablePatches } from 'immer';
import { useRef } from 'react';
import create from "zustand";
import { ToolState } from '../../..';

setAutoFreeze(false);
enablePatches()

export interface ToolStateStore {
    toolStates: ToolState[],
    setToolStates: (toolStates: ToolState[]) => void,
}


export const changes: any[] = []
export const inverseChanges: any[] = []

export const useToolStateStore = create((set: Function) => ({
    toolStates: [],
    setToolStates: (previousToolStateStore: ToolStateStore, activeToolStates: ToolState[]) => set(() => {
            const [nextToolStateStore, patches, inversePatches] = produceWithPatches(
                previousToolStateStore,
                (draft: ToolStateStore) => {
                    activeToolStates.forEach((toolState: ToolState, index: number) => {
                        draft.toolStates[index] = toolState   
                    })
                }  
            ) 
            changes.push(...patches)
            inverseChanges.push(...inversePatches)
            console.log("Changes", changes)
            return nextToolStateStore
        }
    ),
  })
)
