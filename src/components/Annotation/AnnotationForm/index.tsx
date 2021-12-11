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
    TextField, FormControlLabel, FormLabel, RadioGroup, Radio
} from "@mui/material";
import {Style} from "./styles";
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LoadingButton from '@mui/lab/LoadingButton';
import SaveIcon from '@mui/icons-material/Save';
import Variable, {VariableCountType, VariableType} from "./variable";

export enum AnnotationLevel {
    patient,
    study
}

type AnnotationFormStateType = {
    variables: Variable[]
    nameError: boolean
    typeError: boolean
    countError: boolean
    annotationLevel: AnnotationLevel
}

type AnnotationFormPropsType = {
    saveAnnotationForm: Function
    patientsAreLoaded: boolean
}

class AnnotationForm extends Component<AnnotationFormPropsType, AnnotationFormStateType> {

    constructor(props: AnnotationFormPropsType) {
        super(props);
        this.state = {
            variables: [new Variable(0)],
            nameError: false,
            typeError: false,
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
        let countError = false
        if (variable.count === "") {
            countError = true
        }
        variables.push(variable)
        if (!nameError && !typeError && !countError) {
            variables.push(new Variable(id))
        }
        this.setState({
            variables: variables, nameError: nameError, typeError: typeError, countError: countError
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

    addVariableCount = (event, id) => {
        const value = event.target.value
        this.state.variables.forEach((variable) => {
            if (variable.id === id) {
                variable.count = value
                this.setState({countError: false})
            }
        })
    }

    setAnnotationLevel = (event) => {
        const annotationLevel = event.target.value
        this.setState({annotationLevel: annotationLevel})
    }

    renderVariableInput(id: number) {
        let isActiveVariable = false
        if (id === this.state.variables.length - 1) {
            isActiveVariable = true
        }
        let isErrorVariable = false
        if (this.state.nameError || this.state.typeError || this.state.countError) {
            isErrorVariable = true
        }
        return (
            <div id={String(id)}>
                <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>} spacing={2}>
                    <TextField disabled={!isActiveVariable} error={this.state.nameError && isActiveVariable}
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
                            <MenuItem value={VariableType.boolean}>boolean</MenuItem>
                            <MenuItem value={VariableType.integer}>integer number</MenuItem>
                            <MenuItem value={VariableType.decimal}>decimal number</MenuItem>
                            <MenuItem value={VariableType.text}>text</MenuItem>
                            <MenuItem value={VariableType.seed}>seed</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl disabled={!isActiveVariable} error={this.state.countError && isActiveVariable}
                                 variant="filled"
                                 sx={{m: 1, minWidth: 120}}>
                        <InputLabel id="demo-simple-select-filled-label">Count</InputLabel>
                        <Select
                            labelId="demo-simple-select-filled-label" id="demo-simple-select-filled"
                            onChange={(event) => this.addVariableCount(event, id)}
                            value={this.state.variables[id].count}>
                            <MenuItem value={VariableCountType.static}>static</MenuItem>
                            <MenuItem value={VariableCountType.dynamic}>dynamic</MenuItem>
                        </Select>
                    </FormControl>
                    <IconButton color="primary">
                        {isActiveVariable ?
                            <AddIcon value="Hello" disabled={isErrorVariable} variant="contained"
                                     onClick={() => this.addVariable(id + 1)}/>
                            :
                            <RemoveIcon variant="contained" onClick={() => this.removeVariable(id)}/>
                        }
                    </IconButton>
                </Stack>
            </div>
        )
    }

    render() {
        let saveFormDisabeled = true
        if (this.state.variables.length - 1 && this.props.patientsAreLoaded) {
            saveFormDisabeled = false
        }
        return (
            <Style>
                <Container>
                    <Stack direction="column" divider={<Divider orientation="horizontal" flexItem/>}
                           spacing={2}>
                        <Stack direction="row" divider={<Divider orientation="horizontal" flexItem/>}
                               spacing={2}>
                            <LoadingButton
                                disabled={saveFormDisabeled} color="secondary" loadingPosition="start"
                                startIcon={<SaveIcon/>} variant="contained"
                                onClick={() => this.props.saveAnnotationForm(this.state.variables, this.state.annotationLevel)}>
                                Save
                            </LoadingButton>
                            <FormControl component="fieldset">
                                <FormLabel component="legend">Annotation level</FormLabel>
                                <RadioGroup row aria-label="annotationLevel" name="row-radio-buttons-group"
                                            defaultValue={this.state.annotationLevel}
                                            onChange={event => this.setAnnotationLevel(event)}>
                                    <FormControlLabel value={AnnotationLevel.patient} control={<Radio/>}
                                                      label="patient"/>
                                    <FormControlLabel value={AnnotationLevel.study} control={<Radio/>}
                                                      label="study"/>
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
                        </Stack>
                    </Stack>
                </Container>
            </Style>
        );
    }

}

export default AnnotationForm;