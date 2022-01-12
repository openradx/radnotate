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

const ToolType = new Map<VariableType, string>([
    [VariableType.boolean, "Pan"],
    [VariableType.integer, "Pan"],
    [VariableType.decimal, "Pan"],
    [VariableType.seed, "Probe"],
    [VariableType.rectangleRoi, "RectangleRoi"],
    [VariableType.ellipticalRoi, "EllipticalRoi"],
    [VariableType.length, "Length"],
    [VariableType.segmentation, "FreehandScissors"],
])

export enum VariableCountType {
    static,
    dynamic
}

class Variable {
    private _id: number
    private _name: string
    private _type: VariableType | string
    private _countType: VariableCountType | string
    private _count: number
    private _tool: string

    constructor(value: number|Object) {
        if (typeof value === "number") {
            this._id = value
            this._name = ""
            this._type = ""
            this._countType = ""
            this._count = 1
            this._tool = ""
        } else {
            this._id = value.id
            this._name = value.name
            this._type = value.type
            this._countType = value.countType
            this._count = value.count
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

    set countType(value: VariableCountType) {
        this._countType = value;
    }

    set count(value: number) {
        this._count = value;
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

    get countType(): VariableCountType | string {
        return this._countType;
    }
    
    get count(): number {
        return this._count;
    }

    get tool(): string {
        return this._tool;
    }

    toString() {
        const map = new TSMap()
        map.set("id", this._id)
        map.set("name", this._name)
        map.set("type", this._type)
        map.set("countType", this._countType)
        map.set("count", this._count)
        return JSON.stringify(map.toJSON())
    }
}

export default Variable;