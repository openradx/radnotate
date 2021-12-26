import {Component} from "react";
import {
    Container,
    Divider,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    Stack,
    InputLabel,
    TextField, FormControlLabel, FormLabel, RadioGroup, Radio, Button, Tooltip
} from "@mui/material";
import {Style} from "./styles";
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SendIcon from '@mui/icons-material/Send';
import Variable, {VariableCountType, VariableType} from "./variable";
import DicomDropzone from "./DicomDropzone";
import {Patients} from "./DicomDropzone/dicomObject";

export enum AnnotationLevel {
    patient,
    study
}

type AnnotationFormStateType = {
    patients: Patients
    variables: Variable[]
    nameError: boolean
    typeError: boolean
    countTypeError: boolean
    countError: boolean
    annotationLevel: AnnotationLevel
}

type AnnotationFormPropsType = {
    saveAnnotationForm: Function
}

class AnnotationForm extends Component<AnnotationFormPropsType, AnnotationFormStateType> {

    constructor(props: AnnotationFormPropsType) {
        super(props);
        this.state = {
            variables: [new Variable(0)],
            nameError: false,
            typeError: false,
            countTypeError: false,
            countError: false,
            annotationLevel: AnnotationLevel.patient
        }
    }

    addVariable = (id: number) => {
        let variables = this.state.variables
        const variable = variables.pop()
        let nameError = false
        if (variable.name === "") {
            nameError = true
        }
        let typeError = false
        if (variable.type === "") {
            typeError = true
        }
        let countTypeError = false
        let countError = false
        if (variable.countType === "") {
            countTypeError = true
        } else if (variable.countType === VariableCountType.static && variable.count <= 0) {
            countError = true
        }
        variables.push(variable)
        if (!nameError && !typeError && !countTypeError && !countError) {
            variables.push(new Variable(id))
        }
        this.setState({
            variables: variables,
            nameError: nameError,
            typeError: typeError,
            countTypeError: countTypeError,
            countError: countError
        })
    }

    removeVariable = (id: number) => {
        const variables: Variable[] = this.state.variables
        variables.splice(id, 1)
        variables.forEach((variable, index) => {
            variable.id = index
        })
        this.setState({variables: variables})
    }

    addVariableName = (event, id) => {
        const value = event.target.value
        this.state.variables.forEach((variable) => {
            if (variable.id === id) {
                variable.name = value
                this.setState({nameError: false})
            }
        })
    }

    addVariableType = (event, id) => {
        const value = event.target.value
        this.state.variables.forEach((variable) => {
            if (variable.id === id) {
                variable.type = value
                this.setState({typeError: false})
            }
        })
    }

    addVariableCountType = (event, id) => {
        const value = event.target.value
        this.state.variables.forEach((variable) => {
            if (variable.id === id) {
                variable.countType = value
                this.setState({countTypeError: false})
            }
        })
    }

    addVariableCount = (event, id) => {
        const value = event.target.value
        this.state.variables.forEach((variable) => {
            if (variable.id === id) {
                variable.count = Number(value)
                this.setState({countError: false})
            }
        })
    }

    setAnnotationLevel = (event) => {
        const annotationLevel = event.target.value
        this.setState({annotationLevel: annotationLevel})
    }

    savePatients = (patients: Patients) => {
        this.setState({patients: patients})
    }

    renderAnnotationsCountField = (id: number, isActiveVariable: boolean) => {
        if (this.state.variables[id].countType === VariableCountType.static) {
            return (<TextField
                sx={{width: 120, minWidth: 120}}
                disabled={!isActiveVariable}
                color="primary"
                id="filled-number"
                label="Count"
                type="number"
                variant="filled"
                onChange={(event) => {
                    this.addVariableCount(event, id)
                }}
                error={this.state.countError && isActiveVariable}/>)
        }
    }

    _handleButtonClick = (id: number, isActiveVariable: boolean) => {
        if (isActiveVariable) {
            this.addVariable(id + 1)
        } else {
            this.removeVariable(id)
        }
    }

    renderVariableInput(id: number) {
        let isActiveVariable = false
        let toolTitle = "Remove variable"
        if (id === this.state.variables.length - 1) {
            isActiveVariable = true
            toolTitle = "Add variable"
        }
        let isErrorVariable = false
        if (this.state.nameError || this.state.typeError || this.state.counTypeError || (this.state.countError && this.state.variables[id].type === VariableCountType.static)) {
            isErrorVariable = true
        }
        return (
            <div key={String(id)} id={String(id)}>
                <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>} spacing={2}>
                    <TextField sx={{minWidth: 200}} disabled={!isActiveVariable}
                               error={this.state.nameError && isActiveVariable}
                               color="primary"
                               id="filled-basic" label="Variable name" variant="filled"
                               onChange={(event) => this.addVariableName(event, id)}
                               value={this.state.variables[id].name}/>
                    <FormControl disabled={!isActiveVariable} error={this.state.typeError && isActiveVariable}
                                 variant="filled"
                                 sx={{m: 1, minWidth: 120}}>
                        <InputLabel id="demo-simple-select-filled-label">Type</InputLabel>
                        <Select
                            labelId="demo-simple-select-filled-label" id="demo-simple-select-filled"
                            onChange={(event) => this.addVariableType(event, id)} value={this.state.variables[id].type}>
                            {/*<MenuItem value={VariableType.boolean}>boolean</MenuItem>*/}
                            {/*<MenuItem value={VariableType.integer}>integer number</MenuItem>*/}
                            {/*<MenuItem value={VariableType.decimal}>decimal number</MenuItem>*/}
                            <MenuItem value={VariableType.roi}>ROI</MenuItem>
                            <MenuItem value={VariableType.seed}>seed</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl disabled={!isActiveVariable} error={this.state.countTypeError && isActiveVariable}
                                 variant="filled"
                                 sx={{m: 1, minWidth: 120}}>
                        <InputLabel id="demo-simple-select-filled-label">Count type</InputLabel>
                        <Select
                            labelId="demo-simple-select-filled-label" id="demo-simple-select-filled"
                            onChange={(event) => this.addVariableCountType(event, id)}
                            value={this.state.variables[id].countType}>
                            <MenuItem value={VariableCountType.static}>static</MenuItem>
                            <MenuItem value={VariableCountType.dynamic}>dynamic</MenuItem>
                        </Select>
                    </FormControl>
                    {
                        this.renderAnnotationsCountField(id, isActiveVariable)
                    }

                    <Tooltip title={toolTitle}>
                        <IconButton color={"primary"} onClick={() => this._handleButtonClick(id, isActiveVariable)}>
                            {isActiveVariable ?
                                <AddIcon disabled={isErrorVariable} variant="contained"/>
                                :
                                <RemoveIcon variant="contained"/>
                            }
                        </IconButton>
                    </Tooltip>
                </Stack>
            </div>
        )
    }

    render() {
        let saveAnnotationButtonDisabled = true
        if (this.state.patients !== undefined && this.state.variables.length > 1) {
            saveAnnotationButtonDisabled = false
        }
        return (
            <Style>
                <Stack direction="column" divider={<Divider orientation="horizontal" flexItem/>}
                       spacing={2}>
                    <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>}
                           spacing={2}>
                        <DicomDropzone savePatients={this.savePatients}/>
                        <FormControl sx={{minWidth: 150}} component="fieldset">
                            <FormLabel component="legend">Annotation level</FormLabel>
                            <RadioGroup row aria-label="annotationLevel" name="row-radio-buttons-group"
                                        defaultValue={this.state.annotationLevel}
                                        onChange={event => this.setAnnotationLevel(event)}>
                                <FormControlLabel value={AnnotationLevel.patient} control={<Radio/>}
                                                  label="patient"/>
                                <FormControlLabel value={AnnotationLevel.study} control={<Radio/>}
                                                  label="study" disabled={true}/>
                            </RadioGroup>
                        </FormControl>
                        <Button sx={{minWidth: 200}} color="primary" variant="outlined" startIcon={<SendIcon/>}
                                onClick={() => this.props.saveAnnotationForm(this.state.patients, this.state.variables, this.state.annotationLevel)}
                                disabled={saveAnnotationButtonDisabled}>
                            Start annotation
                        </Button>
                    </Stack>
                    <Stack direction="column" divider={<Divider orientation="horizontal" flexItem/>}
                           spacing={2}>
                        {
                            this.state.variables?.map((value, index) => {
                                return this.renderVariableInput(index)
                            })
                        }
                    </Stack>
                </Stack>
            </Style>
        );
    }

}

export default AnnotationForm;