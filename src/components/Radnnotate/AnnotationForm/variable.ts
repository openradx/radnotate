import {TSMap} from "typescript-map";

export enum VariableType {
    boolean,
    integer,
    decimal, // Not implemented
    seed,
    rectangleRoi,
    ellipticalRoi,
    length,
    segmentation
}

export const ToolType = new Map<VariableType, string>([
    [VariableType.boolean, "Pan"],
    [VariableType.integer, "Pan"],
    [VariableType.decimal, "Pan"],
    [VariableType.seed, "Probe"],
    [VariableType.rectangleRoi, "RectangleRoi"],
    [VariableType.ellipticalRoi, "EllipticalRoi"],
    [VariableType.length, "Length"],
    [VariableType.segmentation, "FreehandScissors"],
])

class Variable {
    private _id: number
    private _name: string
    private _type: VariableType | string
    private _tool: string
    private _segmentationIndex: number | undefined

    constructor(value: number|Object) {
        if (typeof value === "number") {
            this._id = value
            this._name = ""
            this._type = ""
            this._tool = ""
        } else {
            this._id = value.id
            this._name = value.name
            this._type = value.type
            this._tool = ToolType.get(value.type)
        }
    }

    set id(value: number) {
        this._id = value;
    }

    set name(value: string) {
        this._name = value;
    }

    set type(value: VariableType) {
        this._type = value;
        this._tool = ToolType.get(value)
    }

    set segmentationIndex(value: number) {
        this._segmentationIndex = value;
    }

    get id(): number {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get type(): VariableType | string {
        return this._type;
    }

    get tool(): string {
        return this._tool;
    }

    get segmentationIndex(): number | undefined {
        return this._segmentationIndex;
    }

    toString() {
        const map = new TSMap()
        map.set("id", this._id)
        map.set("name", this._name)
        map.set("type", this._type)
        return JSON.stringify(map.toJSON())
    }
}

export default Variable;