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
    TextField
} from "@mui/material";
import {Style} from "./styles";
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LoadingButton from '@mui/lab/LoadingButton';
import SaveIcon from '@mui/icons-material/Save';
import Variable, {VariableCount, VariableType} from "./variable";


type AnnotationStateType = {
    variables: Variable[]
    nameError: boolean
    typeError: boolean
    countError: boolean
}


class AnnotationForm extends Component<{}, AnnotationStateType> {

    constructor() {
        super();
        this.state = {
            variables: [new Variable(0)],
            nameError: false,
            typeError: false,
            countError: false,
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

    renderRow(id: number) {
        let isActiveRow = false
        if (id === this.state.variables.length - 1) {
            isActiveRow = true
        }
        let isErrorRow = false
        if (this.state.nameError || this.state.typeError || this.state.countError) {
            isErrorRow = true
        }
        return (
            <div id={String(id)}>
                <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>} spacing={2}>
                    <TextField disabled={!isActiveRow} error={this.state.nameError && isActiveRow} color="primary"
                               id="filled-basic" label="Variable name" variant="filled"
                               onChange={(event) => this.addVariableName(event, id)}
                               value={this.state.variables[id].name}/>
                    <FormControl disabled={!isActiveRow} error={this.state.typeError && isActiveRow} variant="filled"
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
                    <FormControl disabled={!isActiveRow} error={this.state.countError && isActiveRow} variant="filled"
                                 sx={{m: 1, minWidth: 120}}>
                        <InputLabel id="demo-simple-select-filled-label">Count</InputLabel>
                        <Select
                            labelId="demo-simple-select-filled-label" id="demo-simple-select-filled"
                            onChange={(event) => this.addVariableCount(event, id)}
                            value={this.state.variables[id].count}>
                            <MenuItem value={VariableCount.static}>static</MenuItem>
                            <MenuItem value={VariableCount.dynamic}>dynamic</MenuItem>
                        </Select>
                    </FormControl>
                    <IconButton color="primary">
                        {isActiveRow ?
                            <AddIcon value="Hello" disabled={isErrorRow} variant="contained"
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
        return (
            <Style>
                <Container>
                    <LoadingButton
                        color="secondary"
                        loadingPosition="start"
                        startIcon={<SaveIcon/>}
                        variant="contained">
                        Save
                    </LoadingButton>
                    <Stack direction="column" divider={<Divider orientation="horizontal" flexItem/>}
                           spacing={2}>
                        {
                            this.state.variables?.map((value, index) => {
                                return this.renderRow(index)
                            })
                        }
                    </Stack>
                </Container>
            </Style>
        );
    }

}

export default AnnotationForm;