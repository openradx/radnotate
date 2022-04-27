import { loadImage } from "cornerstone-core";
import { TSMap } from "typescript-map";
import { ImageStack } from ".";
import { ToolState, AnnotationToolData, SegmentationToolData, ToolType } from "../..";
import { VariableType } from "../../Form/variable";


export const process = async (toolState: ToolState, imageStack: ImageStack, activeSeries: string) => {
    let activeAnnotation: TSMap<string, string>
    switch(toolState.type){
        case ToolType.annotation:
            activeAnnotation = processAnnotation(toolState)
            activeAnnotation.set("data", JSON.stringify(toolState.data))
            break;
        case ToolType.segmentation:
            activeAnnotation = _processSegmentation((toolState.data as SegmentationToolData).pixelData, toolState.data.segmentationIndex)
            break;
    }
    const defaultValues = await _processImage(toolState.imageID, imageStack, activeSeries)
    activeAnnotation = new TSMap<string, string>([...activeAnnotation.entries(), ...defaultValues.entries()])
    return activeAnnotation
}

export const processAnnotation = (toolState: ToolState): TSMap<string, string> => {
    let activeAnnotation: TSMap<string, string> = new TSMap()
    switch(toolState.variableType) {
        case VariableType.seed:
            activeAnnotation = _processSeed((toolState.data as AnnotationToolData).data)
            break;
        case VariableType.length:
            activeAnnotation = _processLength((toolState.data as AnnotationToolData).data)
            break;
        case VariableType.ellipticalRoi:
            activeAnnotation = _processEllipticalRoi((toolState.data as AnnotationToolData).data)
            break;
        case VariableType.rectangleRoi:
            activeAnnotation = _processRectangleRoi((toolState.data as AnnotationToolData).data)
            break;
    }
    return activeAnnotation
}

export const equal = (object: TSMap<string, string>, other: TSMap<string, string>) => {
    let equal = true
    object.forEach((value1, key) => {
        const value2 = other.get(key)
        if (value1 !== value2) {
            equal = false
        }
    });
    return equal
}

const _processSegmentation = (pixelData: Uint8Array, segmentationIndex: number): TSMap<string, string> => {
    const segmentation = new TSMap<string, string>()
    const b64encoded = btoa(String.fromCharCode.apply(null, pixelData));
    segmentation.set("pixelData", b64encoded)
    segmentation.set("segmentationIndex", String(segmentationIndex))
    return segmentation
}

const _processSeed = (data: {cachedStats: {x: string, y: string}}) => {
    const coordinates = data.cachedStats
    const x = coordinates.x
    const y = coordinates.y
    const seed = new TSMap<string, string>()
    seed.set("x", x)
    seed.set("y", y)
    return seed
}

const _processRectangleRoi = (data: {handles: {start: {x: string, y: string}, end: {x: string, y: string}}}) => {
    const coordinates = data.handles
    const roi = new TSMap<string, string>()
    const x1 = Number(coordinates.start.x)
    const y1 = Number(coordinates.start.y)
    const x2 = Number(coordinates.end.x)
    const y2 = Number(coordinates.end.y)
    const minX = Math.floor(Math.min(x1, x2))
    const maxX = Math.ceil(Math.max(x1, x2))
    const minY = Math.floor(Math.min(y1, y2))
    const maxY = Math.ceil(Math.max(y1, y2))
    roi.set("x1", String(minX))
    roi.set("y1", String(minY))
    roi.set("x2", String(maxX))
    roi.set("y2", String(maxY))
    return roi
}

const _processEllipticalRoi = (data: {handles: {start: {x: string, y: string}, end: {x: string, y: string}}}) => {
    const coordinates = data.handles
    const roi = new TSMap<string, string>()
    const x1 = parseInt(coordinates.start.x)
    const y1 = parseInt(coordinates.start.y)
    const x2 = parseInt(coordinates.end.x)
    const y2 = parseInt(coordinates.end.y)
    const centerX = Math.abs(x1 - x2) + Math.min(x1, x2)
    const centerY = Math.abs(y1 - y2) + Math.min(y1, y2)
    const a = centerX - Math.min(x1, x2)
    const b = centerY - Math.min(y1, y2)
    roi.set("x", String(centerX))
    roi.set("y", String(centerY))
    roi.set("a", String(a))
    roi.set("b", String(b))
    return roi
}

//TODO Fix return type of coordinates, it actually returns numbers not string, cast to string
const _processLength = (data: {handles: {start: {x: string, y: string}, end: {x: string, y: string}}, length: string}) => {
    const coordinates = data.handles
    const length = new TSMap<string, string>()
    length.set("x1", coordinates.start.x)
    length.set("y1", coordinates.start.y)
    length.set("x2", coordinates.end.x)
    length.set("y2", coordinates.end.y)
    length.set("length", data.length)
    return length
}

const _processImage = async (imageID: string, imageStack: ImageStack, activeSeries: string): Promise<TSMap<string, string>> => {
    return await new Promise(resolve => {
        loadImage(imageID).then((image) => {
            const defaultValue = new TSMap<string, string>()
            const instanceNumber = imageStack.instanceNumbers.get(imageID)
            const numberOfInstances = imageStack.seriesDescriptions.get(activeSeries).length
            defaultValue.set("instanceNumber", String(instanceNumber))
            defaultValue.set("width", String(image.width))
            defaultValue.set("height", String(image.height))
            defaultValue.set("pixelSpacing", image.data.string('x00280030'))
            defaultValue.set("sliceThickness", image.data.string('x00180050'))
            defaultValue.set("numberOfInstances", String(numberOfInstances))
            defaultValue.set("studyUid", image.data.string('x0020000d'))
            defaultValue.set("seriesUid", image.data.string('x0020000e'))
            defaultValue.set("sopUid", image.data.string('x00080018'))
            defaultValue.set("seriesNumber", image.data.string('x00200011'))
            defaultValue.set("tablePosition", image.data.string('x00201041'))
            resolve(defaultValue)
        })
    })
}
