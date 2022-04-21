import produce, { setAutoFreeze, produceWithPatches, enablePatches, Patch, enableMapSet } from 'immer';
import create from "zustand";
import { ToolState, ToolType } from '../../..';
import deepClone from 'deep-clone';
import * as _ from 'lodash';
import { equal, processAnnotation } from '../utils';

setAutoFreeze(false);
enablePatches()
enableMapSet()

export interface ToolStateStore {
    toolStates: ToolState[],
    setToolStates: (toolStates: ToolState[]) => void,
    previousAnnotations: Map<string, Object>,
    addPreviousAnnotation: (string: uuid, variableID: number, patientID: number) => void,
    clearPreviousAnnotations: () => void,
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
    previousAnnotations: new Map<string, Object>(),
    addPreviousAnnotation: (uuid: string, variableID: number, patientID: number) => set((toolStateStore: ToolStateStore) => ({previousAnnotations: toolStateStore.previousAnnotations.set(uuid, {variableID: variableID, patientID: patientID})})),
    clearPreviousAnnotations: () => set(() => ({previousAnnotations: new Map<string, Object>()}))
})
)
