export enum VariableType {
    boolean,
    integer,
    decimal,
    text,
    seed
}

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

    constructor(id: number) {
        this._id = id
        this._name = ""
        this._type = ""
        this._countType = ""
        this._count = 0
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
}

export default Variable;