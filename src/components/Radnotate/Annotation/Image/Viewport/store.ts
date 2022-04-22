import produce, { setAutoFreeze, produceWithPatches, enablePatches, Patch, enableMapSet } from 'immer';
import create from "zustand";
import { ToolState, ToolType } from '../../..';
import deepClone from 'deep-clone';
import * as _ from 'lodash';
import { equal, processAnnotation } from '../utils';
import { convertToFalseColorImage } from 'cornerstone-core';

setAutoFreeze(false);
enablePatches()
enableMapSet()

interface CellID {
    patientID: string, 
    variableID: number
}

export interface ToolStateStore {
    undoPatches: Patch[],
    redoPatches: Patch[],
    toolStates: ToolState[],
    setToolStates: (toolStates: ToolState[]) => void,
    clearToolStates: () => void,
    previousAnnotations: Map<string, Object>,
    addPreviousAnnotation: (uuid: string, variableID: number, patientID: number) => void,
    clearPreviousAnnotations: () => void,
    inactiveToolStates: Map<CellID, ToolState[]>,
    addInactiveToolStates: (patientID: string, variableID: number, toolStates: ToolState[]) => void,
}

export const useToolStateStore = create((set: Function, get: Function) => ({
    undoPatches: [],
    redoPatches: [],
    toolStates: [],
    setToolStates: (activeToolStates: ToolState[], appliedPatch: Patch) => {
            const [nextToolStates, , inversePatches] = produceWithPatches(
                get().toolStates,
                (draft: ToolState[]) => {
                    if (activeToolStates.length >= get().toolStates.length) {
                        const append: ToolState[] = []
                        activeToolStates.forEach((toolState: ToolState) => {
                            if (toolState.type === ToolType.annotation) {
                                toolState = deepClone(toolState)
                                const uuid = toolState.data.data.uuid
                                const index = get().toolStates.findIndex((toolState: ToolState) => toolState.data.data.uuid === uuid)
                                if (index >= 0) {
                                    const draftToolState = deepClone(get().toolStates[index])
                                    if (draftToolState === undefined || !equal(processAnnotation(draftToolState), processAnnotation(toolState))) {
                                        draft[index] = toolState
                                    }
                                } else {
                                    append.push(toolState)
                                }
                            } else {
                                draft.length = 0
                                draft.push(...activeToolStates)
                            }
                        })
                        if (append.length) {
                            draft.push(...append)
                        }
                    } 
                    else if (get().toolStates.length) {
                        let deleteCount = 0
                        get().toolStates.forEach((toolState: ToolState, deleteIndex: number) => {
                            if (toolState.type === ToolType.annotation) {
                                const uuid = toolState.data.data.uuid
                                const index = activeToolStates.findIndex((toolState: ToolState) => toolState.data.data.uuid === uuid)
                                if (index < 0) {
                                    draft.splice(deleteIndex - deleteCount, 1)
                                    deleteCount++
                                }
                            } else {
                                draft.length = 0
                                draft.push(...activeToolStates)
                            }
                        })
                    } else {
                        console.log("Awa")
                    }
                }  
            )
            // Redo or manual changes
            if (appliedPatch === undefined) {
                const undoPatches = get().undoPatches
                if(get().toolStates.length > nextToolStates.length) {
                    const redoPatches = get().redoPatches
                    redoPatches.push(...inversePatches)
                    set({redoPatches: redoPatches})
                } else {
                    undoPatches.push(...inversePatches)
                }
                set({undoPatches: undoPatches})
            // Undo
            } else {
                const redoPatches = get().redoPatches
                redoPatches.push(...inversePatches)
                set({redoPatches: redoPatches})
            }
            set({toolStates: nextToolStates})
    },
    clearToolStates: () => set(() => ({
        undoPatches: [],
        redoPatches: [],
        toolStates: [],
    })),
    previousAnnotations: new Map<CellID, Object>(),
    addPreviousAnnotation: (uuid: string, variableID: number, patientID: number) => set((toolStateStore: ToolStateStore) => ({
        previousAnnotations: toolStateStore.previousAnnotations.set(uuid, {variableID: variableID, patientID: patientID})
    })),
    clearPreviousAnnotations: () => set(() => ({previousAnnotations: new Map<string, Object>()})),
    inactiveToolStates: new Map<CellID, ToolState[]>(),
    addInactiveToolStates: (patientID: string, variableID: number, toolStates: ToolState[]) => (toolStateStore: ToolStateStore) => {
        const cellID: CellID = {
            patientID: patientID,
            variableID: variableID
        }
        const previous = toolStateStore.inactiveToolStates.get(cellID)
        if (previous === undefined) {
            set({inactiveAnnotations: toolStateStore.inactiveToolStates.set(cellID, toolStates)})
        } else {
            set({inactiveAnnotations: toolStateStore.inactiveToolStates.set(cellID, [ ...previous,...toolStates])})
        }
    },
})
)
