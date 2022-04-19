import { setAutoFreeze, produceWithPatches, enablePatches, Patch } from 'immer';
import create from "zustand";
import { ToolState, ToolType } from '../../..';
import deepClone from 'deep-clone';
import * as _ from 'lodash';
import { equal, processAnnotation } from '../utils';

setAutoFreeze(false);
enablePatches()

export interface ToolStateStore {
    toolStates: ToolState[],
    setToolStates: (toolStates: ToolState[]) => void,
}

export const redoPatches: Patch[] = []
export const undoPatches: Patch[] = []

export const useToolStateStore = create((set: Function, get: Function) => ({
    toolStates: [],
    setToolStates: (previousToolStateStore: ToolStateStore, activeToolStates: ToolState[], appliedPatch: Patch) => set(() => {
            const [nextToolStateStore, , inversePatches] = produceWithPatches(
                previousToolStateStore,
                (draft: ToolStateStore) => {
                    if (activeToolStates.length) {
                        activeToolStates.forEach((toolState: ToolState, index: number) => {
                            if (toolState.type === ToolType.annotation) {
                                const deepToolState = deepClone(toolState)
                                const draftToolState = deepClone(get().toolStates[index])
                                if (draftToolState === undefined || !equal(processAnnotation(draftToolState), processAnnotation(deepToolState))) {
                                    draft.toolStates[index] = deepToolState
                                }
                            }
                        })
                    }
                    if (appliedPatch !== undefined && appliedPatch.path[1] === "length") {
                        draft.toolStates.pop()
                    }
                }  
            )
            // Redo or undefined
            if (appliedPatch === undefined) { 
                // inversePatches.forEach(patch => {
                //     console.log("Patch", patch.path)
                // })
                undoPatches.push(...inversePatches)
            // Undo
            } else {
                redoPatches.push(...inversePatches)
            }
            return nextToolStateStore
        }
    ),
  })
)
