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
    private _type: VariableType
    private _count: VariableCount

    constructor(id: number) {
        this._id = id
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

    get name(): string {
        return this._name;
    }

    get type(): VariableType {
        return this._type;
    }

    get count(): VariableCount {
        return this._count;
    }
}

export default Variable;