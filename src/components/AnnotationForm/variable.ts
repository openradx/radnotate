export enum VariableType {
    boolean,
    integer,
    decimal,
    text,
    seed
}

export enum VariableCount {
    static,
    dynamic
}

class Variable {
    private _id: number
    private _name: string
    private _type: VariableType | string
    private _count: VariableCount | string

    constructor(id: number) {
        this._id = id
        this._name = ""
        this._type = ""
        this._count = ""
    }

    set id(value: number) {
        this._id = value;
    }

    set name(value: string) {
        this._name = value;
    }

    set type(value: VariableType) {
        this._type = value;
    }

    set count(value: VariableCount) {
        this._count = value;
    }

    get id(): number {
        return this._id;
    }

    get name(): string | undefined {
        return this._name;
    }

    get type(): VariableType | undefined {
        return this._type;
    }

    get count(): VariableCount | undefined {
        return this._count;
    }
}

export default Variable;