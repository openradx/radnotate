import {ChangeEvent, FormEvent, ReactElement, useEffect, useState} from "react";
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
    Select, SelectChangeEvent,
    Stack, Switch,
    TextField,
    Tooltip, Typography
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SendIcon from '@mui/icons-material/Send';
import Variable, {VariableType} from "./variable";
import DicomDropzone from "./DicomDropzone";
import Papa from "papaparse";
import {CustomWidthTooltip} from "../styles";
import dirLogo from "./dir_logo.png";
import ukhdLogo from "./ukhd_logo.png";
import {RadnotateState, useRadnotateStore} from "../../Radnotate";

export enum AnnotationLevel {
    // eslint-disable-next-line no-unused-vars
    patient,
    // eslint-disable-next-line no-unused-vars
    study,
}

type FormProps = {
    saveAnnotationForm: Function,
}

const Form = (props: FormProps): ReactElement => {
    const globalVariables = useRadnotateStore((state: RadnotateState) => state.variables)
    const [patients, setPatients] = useState(useRadnotateStore((state: RadnotateState) => state.patients))
    const [variables, setVariables] = useState(globalVariables)
    const [nameError, setNameError] = useState(false)
    const [typeError, setTypeError] = useState(false)
    const [annotationLevel, setAnnotationLevel] = useState(AnnotationLevel.patient)
    const [rows, setRows] = useState([])
    const [loadAnnotations, setLoadAnnotations] = useState(false)
    const [loadAnnotationsDisabled, setLoadAnnotationsDisabled] = useState(true)
    const [saveAnnotationButtonDisabled, setSaveAnnotationButtonDisabled] = useState(true)

    useEffect(() => {
        if (globalVariables.length > 1 || globalVariables[0].name !== "") {
            globalVariables.push(new Variable(globalVariables.length))
            setVariables([...globalVariables])
        }
    }, [globalVariables])

    useEffect(() => {
        let saveAnnotationButtonDisabled = true
        if (patients.patients.length > 0 && variables.length > 1) {
            saveAnnotationButtonDisabled = false
        }
        setSaveAnnotationButtonDisabled(saveAnnotationButtonDisabled)
    }, [patients, variables])

    const addVariable = (id: number): void => {
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
        setVariables([...variables])
        setNameError(nameError)
        setTypeError(typeError)
    }

    const removeVariable = (id: number): void => {
        variables.splice(id, 1)
        variables.forEach((variable: Variable, index: number) => {
            variable.id = index
        })
        setVariables([...variables])
    }

    const addVariableName = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, id: number): void => {
        const value = event.target.value
        variables.forEach((variable: Variable) => {
            if (variable.id === id) {
                variable.name = value
                setNameError(false)
            }
        })
        setVariables([...variables])
    }

    const addVariableType = (event: SelectChangeEvent, id: number): void => {
        const value = event.target.value
        variables.forEach((variable: Variable) => {
            if (variable.id === id) {
                // @ts-ignore
                variable.type = value
                setTypeError(false)
            }
        })
        setVariables([...variables])
    }

    const addAnnotationLevel = (event: ChangeEvent<HTMLInputElement>): void => {
        const annotationLevel = event.target.value
        // @ts-ignore
        setAnnotationLevel(annotationLevel)
    }

    const _handleButtonClick = (id: number, isActiveVariable: boolean): void => {
        if (isActiveVariable) {
            addVariable(id + 1)
        } else {
            removeVariable(id)
        }
    }

    const _setLoadAnnotationsSwitch = (event: FormEvent<HTMLInputElement>): void => {
        // @ts-ignore
        if (event.target.checked) {
            setLoadAnnotations(true)
        } else {
            setLoadAnnotations(false)
        }
    }

    const _loadExport = (event: FormEvent<HTMLInputElement>): void => {
        // @ts-ignore
        const files = event.target.files
        if (files.length > 0) {
            const file = files[0]
            _loadVariableDefinitions(file)
            _loadAnnotationData(file)
            setLoadAnnotationsDisabled(false)
        }
    }

    const _loadVariableDefinitions = (file: File): void => {
        const loadHeader = new Promise<string[] | undefined>((resolve) => {
            Papa.parse(file, {
                header: true,
                delimiter: ";",
                complete: results => {
                    resolve(results.meta.fields?.slice(1,))
                }
            })
        })
        loadHeader.then((headers: string[] | undefined): void => {
            if (headers !== undefined) {
                const variables: Variable[] = []
                headers.forEach((header: string) => {
                    const headerAsJson = JSON.parse(header)
                    variables.push(new Variable(headerAsJson))
                })
                variables.push(new Variable(variables.length))
                setVariables(variables)
            }
        })
    }

    const _loadAnnotationData = (file: File): void => {
        const loadData = new Promise<{ PatientID: string, id: number }[]>((resolve) => {
            Papa.parse(file, {
                header: true,
                delimiter: ";",
                complete: results => {
                    // @ts-ignore
                    const data: { PatientID: string, id: number }[] = results.data
                    data.sort((a: { PatientID: string }, b: { PatientID: string }) => {
                        return a.PatientID.localeCompare(b.PatientID);
                    })
                    data.forEach((row: { id: number }, index: number) => {
                        row.id = index
                    })
                    resolve(data)
                }
            })
        })
        loadData.then((rows) => {
            // @ts-ignore
            setRows(rows)
        })
    }

    const renderVariableInput = (id: number): ReactElement => {
        let isActiveVariable = false
        let toolTitle = "Remove variable"
        if (id === variables.length - 1) {
            isActiveVariable = true
            toolTitle = "Add variable"
        }
        let isErrorVariable = false
        if (nameError || typeError) {
            isErrorVariable = true
        }
        return (
            <div key={String(id)} id={String(id)}>
                <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>} spacing={2}>
                    <TextField sx={{minWidth: 200, maxWidth: 200}} disabled={!isActiveVariable}
                               error={nameError && isActiveVariable}
                               color="primary"
                               id="filled-basic" label="Variable name" variant="filled"
                               onChange={(event:
                                              ChangeEvent<HTMLTextAreaElement | HTMLInputElement>): void => addVariableName(event, id)}
                               value={variables[id].name}/>
                    <FormControl disabled={!isActiveVariable} error={typeError && isActiveVariable}
                                 variant="filled"
                                 sx={{minWidth: 175, maxWidth: 175}}>
                        <InputLabel id="demo-simple-select-filled-label">Variable type</InputLabel>
                        <Select
                            labelId="demo-simple-select-filled-label" id="demo-simple-select-filled"
                            onChange={(event: SelectChangeEvent): void => addVariableType(event, id)}
                            value={variables[id].type}>
                            <MenuItem value={VariableType.boolean}>boolean</MenuItem>
                            <MenuItem value={VariableType.integer}>integer number</MenuItem>
                            <MenuItem value={VariableType.seed}>seed</MenuItem>
                            <MenuItem value={VariableType.length}>length</MenuItem>
                            <MenuItem value={VariableType.segmentation}>segmentation</MenuItem>
                            <MenuItem value={VariableType.rectangleRoi}>rectangle ROI</MenuItem>
                            <MenuItem value={VariableType.ellipticalRoi}>elliptical ROI</MenuItem>
                        </Select>
                    </FormControl>
                    <Tooltip title={toolTitle}>
                        <IconButton color={"primary"} onClick={(): void => _handleButtonClick(id, isActiveVariable)}>
                            {isActiveVariable ?
                                // @ts-ignore
                                <AddIcon disabled={isErrorVariable} variant="contained"></AddIcon>
                                :
                                // @ts-ignore
                                <RemoveIcon variant="contained"/>
                            }
                        </IconButton>
                    </Tooltip>
                </Stack>
            </div>
        )
    }

    return (
        <Box sx={{marginLeft: 8}}>
            <Stack direction="row" divider={<Divider orientation="horizontal" flexItem/>}>
                <Stack direction="column" divider={<Divider orientation="horizontal" flexItem/>}
                       spacing={2}>
                    <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>}
                           spacing={2} alignItems={"center"}>
                        <DicomDropzone setPatients={setPatients}/>
                        <Button sx={{minWidth: 175, maxWidth: 175, textAlign: "center"}} variant="outlined"
                                component="label">
                            Load previous export CSV file
                            <input type="file" hidden={true}
                                   onInput={((event: FormEvent<HTMLInputElement>): void => _loadExport(event))}/>
                        </Button>
                        <CustomWidthTooltip
                            title={"Load annotations from previous export CSV file for validation purposes"}>
                            <FormGroup sx={{minWidth: 140, maxWidth: 140}}>
                                <FormControlLabel control={<Switch disabled={loadAnnotationsDisabled}
                                                                   checked={loadAnnotations}
                                                                   value={loadAnnotations}
                                                                   onChange={(event: ChangeEvent<HTMLInputElement>): void => _setLoadAnnotationsSwitch(event)}/>}
                                                  label="Load annotations"/>
                            </FormGroup>
                        </CustomWidthTooltip>
                        <FormControl sx={{minWidth: 190}} component="fieldset">
                            <FormLabel component="legend">Annotation level</FormLabel>
                            <RadioGroup row aria-label="annotationLevel" name="row-radio-buttons-group"
                                        defaultValue={annotationLevel}
                                        onChange={(event: ChangeEvent<HTMLInputElement>): void => addAnnotationLevel(event)}>
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
                            variables?.map((value: Variable, index: number) => {
                                return renderVariableInput(index)
                            })
                        }
                        <Button sx={{minWidth: 200, maxWidth: 200, minHeight: 55}} color="primary"
                                variant="outlined" startIcon={<SendIcon/>}
                                onClick={(): void => {
                                    props.saveAnnotationForm(patients, variables.slice(0, variables.length - 1), rows, annotationLevel)
                                }}
                                disabled={saveAnnotationButtonDisabled}>
                            Start annotation
                        </Button>
                    </Stack>
                </Stack>
                <Box sx={{marginLeft: 10, paddingRight: 8, minWidth: 400}}>
                    <Stack direction={"column"} spacing={5}>
                        <Typography variant="body1" align={"justify"}>
                            Dear colleagues,<br/><br/>
                            Radnotate is a radiological annotation tool for DICOM data for a fast and convenient
                            annotation workflow. The development took place in my spare time. Primary goal was
                            to simplify the annotation work flow, automating as much as possible, which is
                            especially useful if you have a large amount of data. Compared to tools like MITK, the
                            tool set is reduced. The strength of Radnotate rather lies in doing simple things
                            faster. I developed it for my personal research needs, but naturally I hope to provide a
                            benefit for all my colleagues. If Radnotate helps you to focus more of your time on your
                            actual scientific project, then please consider me, when possible, in your publications.
                            For a detailed explanation on how to use Radnotate, see the help section in the settings
                            menu.<br/><br/>
                            Kind regards,<br/>
                            Manuel Debić
                        </Typography>
                        <Stack direction={"row"} spacing={5} alignItems={"center"} justifyContent={"space-evenly"}
                               flexWrap={"wrap"}>
                            <Box
                                component={"img"}
                                sx={{width: 300}}
                                src={dirLogo}
                            />
                            <Box
                                component={"img"}
                                sx={{width: 200, paddingBottom: 5}}
                                src={ukhdLogo}
                            />
                        </Stack>
                    </Stack>
                </Box>
            </Stack>
        </Box>
    )

}

export default Form;