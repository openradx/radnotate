import React, {Component} from "react";
import {
    Box,
    Button,
    Divider,
    FormControl,
    FormControlLabel, FormGroup,
    FormLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Stack, Switch,
    TextField,
    Tooltip
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SendIcon from '@mui/icons-material/Send';
import Variable, {VariableType} from "./variable";
import DicomDropzone from "./DicomDropzone";
import {Patients} from "./DicomDropzone/dicomObject";
import Papa from "papaparse";

export enum AnnotationLevel {
    patient,
    study
}

type AnnotationFormStateType = {
    patients: Patients
    variables: Variable[]
    nameError: boolean
    typeError: boolean
    annotationLevel: AnnotationLevel,
    rows: Object | undefined,
    loadAnnotations: boolean
}

type AnnotationFormPropsType = {
    saveAnnotationForm: Function,
}

class AnnotationForm extends Component<AnnotationFormPropsType, AnnotationFormStateType> {

    constructor(props: AnnotationFormPropsType) {
        super(props);
        this.state = {
            variables: [new Variable(0)],
            nameError: false,
            typeError: false,
            annotationLevel: AnnotationLevel.patient,
            rows: undefined,
            loadAnnotations: false
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
        variables.push(variable)
        if (!nameError && !typeError) {
            variables.push(new Variable(id))
        }
        this.setState({
            variables: variables,
            nameError: nameError,
            typeError: typeError,
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

    setAnnotationLevel = (event) => {
        const annotationLevel = event.target.value
        this.setState({annotationLevel: annotationLevel})
    }

    savePatients = (patients: Patients) => {
        this.setState({patients: patients})
    }

    _handleButtonClick = (id: number, isActiveVariable: boolean) => {
        if (isActiveVariable) {
            this.addVariable(id + 1)
        } else {
            this.removeVariable(id)
        }
    }

    _setLoadAnnotationsSwitch = (event: Event) => {
        if (event.target.checked) {
            this.setState({loadAnnotations: true})
        } else {
            this.setState({loadAnnotations: false})
        }
    }

    _loadExport = (event: Event) => {
        if (event.target.files.length > 0) {
            const file = event.target.files[0]
            this._loadVariableDefinitions(file)
            this._loadAnnotationData(file)
        }
    }

    _loadVariableDefinitions = (file: File) => {
        const loadHeader = new Promise((resolve) => {
                Papa.parse(file, {
                    header: true,
                    complete: results => {
                        resolve(results.meta.fields?.slice(1,))
                    }
                })
            })
        loadHeader.then((headers) => {
            const variables: Variable[] = []
            headers.forEach((header) => {
                const headerAsJson = JSON.parse(header)
                variables.push(new Variable(headerAsJson))
            })
            variables.push(new Variable(variables.length))
            this.setState({variables: variables})
        })
    }

    _loadAnnotationData = (file: File) => {
        const loadData = new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                complete: results => {
                    const data = results.data
                    data.forEach((row, index) => {
                        row.id = index
                    })
                    resolve(data)
                }
            })
        })
        loadData.then((rows) => {
            this.setState({rows: rows})
        })
    }

    renderVariableInput(id: number) {
        let isActiveVariable = false
        let toolTitle = "Remove variable"
        if (id === this.state.variables.length - 1) {
            isActiveVariable = true
            toolTitle = "Add variable"
        }
        let isErrorVariable = false
        if (this.state.nameError || this.state.typeError) {
            isErrorVariable = true
        }
        return (
            <div key={String(id)} id={String(id)}>
                <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>} spacing={2}>
                    <TextField sx={{minWidth: 200, maxWidth: 200}} disabled={!isActiveVariable}
                               error={this.state.nameError && isActiveVariable}
                               color="primary"
                               id="filled-basic" label="Variable name" variant="filled"
                               onChange={(event) => this.addVariableName(event, id)}
                               value={this.state.variables[id].name}/>
                    <FormControl disabled={!isActiveVariable} error={this.state.typeError && isActiveVariable}
                                 variant="filled"
                                 sx={{minWidth:175, maxWidth:175}}>
                        <InputLabel id="demo-simple-select-filled-label">Type</InputLabel>
                        <Select
                            labelId="demo-simple-select-filled-label" id="demo-simple-select-filled"
                            onChange={(event) => this.addVariableType(event, id)} value={this.state.variables[id].type}>
                            <MenuItem value={VariableType.boolean}>boolean</MenuItem>
                            <MenuItem value={VariableType.integer}>integer number</MenuItem>
                            {/*<MenuItem value={VariableType.decimal}>decimal number</MenuItem>*/}
                            <MenuItem value={VariableType.seed}>seed</MenuItem>
                            <MenuItem value={VariableType.length}>length</MenuItem>
                            <MenuItem value={VariableType.segmentation}>segmentation</MenuItem>
                            <MenuItem value={VariableType.rectangleRoi}>rectangle ROI</MenuItem>
                            <MenuItem value={VariableType.ellipticalRoi}>elliptical ROI</MenuItem>
                        </Select>
                    </FormControl>
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
            <Box sx={{marginLeft: 8}}>
                <Stack direction="column" divider={<Divider orientation="horizontal" flexItem/>}
                       spacing={2}>
                    <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>}
                           spacing={2} alignItems={"center"}>
                        <DicomDropzone savePatients={this.savePatients}/>
                        <Button sx={{minWidth: 175, maxWidth: 175, textAlign:"center"}} variant="outlined" component="label">
                            Load previous export
                            <input type="file" hidden={true} onInput={(event => this._loadExport(event))}/>
                        </Button>
                        <FormGroup sx={{minWidth: 140, maxWidth: 140}}>
                            <FormControlLabel control={<Switch checked={this.state.loadAnnotations}
                                                               value={this.state.loadAnnotations}
                                                               onChange={event => this._setLoadAnnotationsSwitch(event)}/>}
                                              label="Load annotations"/>
                        </FormGroup>
                        <FormControl sx={{minWidth: 190}} component="fieldset">
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
                    </Stack>
                    <Stack direction="column" divider={<Divider orientation="horizontal" flexItem/>}
                           spacing={2}>
                        {
                            this.state.variables?.map((value, index) => {
                                return this.renderVariableInput(index)
                            })
                        }
                        <Button sx={{minWidth: 200, maxWidth: 200, minHeight: 55}} color="primary" variant="outlined" startIcon={<SendIcon/>}
                                onClick={() => {
                                    let variables = this.state.variables
                                    variables = variables.slice(0, variables.length - 1)
                                    if (this.state.loadAnnotations) {
                                        this.props.saveAnnotationForm(this.state.patients, variables, this.state.annotationLevel, this.state.rows)
                                    } else {
                                        this.props.saveAnnotationForm(this.state.patients, variables, this.state.annotationLevel)
                                    }
                                }}
                                disabled={saveAnnotationButtonDisabled}>
                            Start annotation
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        );
    }

}

export default AnnotationForm;