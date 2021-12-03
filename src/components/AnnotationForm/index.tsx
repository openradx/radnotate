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
    counter: number
}


class AnnotationForm extends Component<{}, AnnotationStateType> {

    constructor() {
        super();
        this.state = {
            variables: [new Variable(0)],
            counter: 0
        }
    }

    addVariable = (id: number) => {
        let variables = this.state.variables
        let counter = this.state.counter
        variables.push(new Variable(id))
        counter = counter + 1
        this.setState({variables: variables, counter: counter})
    }

    removeVariable = (id: number) => {
        let variables: Variable[]
        this.state.variables.forEach((variable) => {
            if (variable.id !== id) {
                if (variables === undefined) {
                    variables = [variable]
                } else {
                    variables.push(variable)
                }
            }
        })
        this.setState({variables: variables})
    }

    addVariableName = (event) => {
        const value = event.target.value
    }

    addVariableType = (event) => {
        const value = event.target.value
    }

    addVariableType = (event) => {
        const value = event.target.value
    }

    renderRow(id:number) {
        let showPlus = true
        if (id) {
            showPlus = false
        }
        return (
            <div id={String(id)}>
                <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>}
                       spacing={2}>
                    <TextField color="primary" id="filled-basic" label="Variable name" variant="filled"
                               onChange={(event) => this.addVariableName(event)}/>
                    <FormControl variant="filled" sx={{m: 1, minWidth: 120}}>
                        <InputLabel id="demo-simple-select-filled-label">Type</InputLabel>
                        <Select
                            labelId="demo-simple-select-filled-label"
                            id="demo-simple-select-filled"
                            onChange={(event) => this.addVariableType(event)}>
                            <MenuItem value={VariableType.boolean}>boolean</MenuItem>
                            <MenuItem value={VariableType.integer}>integer number</MenuItem>
                            <MenuItem value={VariableType.decimal}>decimal number</MenuItem>
                            <MenuItem value={VariableType.text}>text</MenuItem>
                            <MenuItem value={VariableType.seed}>text</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl variant="filled" sx={{m: 1, minWidth: 120}}>
                        <InputLabel id="demo-simple-select-filled-label">Count</InputLabel>
                        <Select
                            labelId="demo-simple-select-filled-label"
                            id="demo-simple-select-filled"
                            onChange={(event) => this.addVariableType(event)}>
                            <MenuItem value={VariableCount.static}>static</MenuItem>
                            <MenuItem value={VariableCount.dynamic}>dynamic</MenuItem>
                        </Select>
                    </FormControl>
                    <IconButton color="primary">
                        {showPlus ?
                            <AddIcon variant="contained" onClick={() => this.addVariable(id+1)}/>
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
                    {
                        this.state.variables?.map((value, index) => {
                            return this.renderRow(index)
                        })
                    }
                </Container>
            </Style>
        );
    }

}

export default AnnotationForm;