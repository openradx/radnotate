import React, {Component} from 'react'
import Dropzone, {DropEvent} from 'react-dropzone'
import {Patients} from "./dicomObject";
import {trackPromise} from "react-promise-tracker";
import {fromEvent, FileWithPath} from "file-selector";
import {loadFile} from "./loaders";
import {Box, Button, CircularProgress, CircularProgressProps, Snackbar, Typography} from "@mui/material";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import cornerstone from "cornerstone-core";
import dicomParser from "dicom-parser";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

function CircularProgressWithLabel(props: CircularProgressProps & { value: number }) {
    return (
        <Box sx={{
            position: 'absolute',
            marginLeft: 10.5,
            marginTop: -5.8
        }}>
            <CircularProgress sx={{
                color: "secondary.main"
            }} variant="determinate" {...props} />
            <Box
                sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                <Typography
                    variant="caption"
                    component="div"
                    color="text.primary"
                >{`${Math.round(props.value)}%`}</Typography>
            </Box>
        </Box>
    );
}

type DicomDropzoneState = {
    patients: Patients | null,
    loadingPatients: boolean,
    loadingAcceptedFiles: boolean,
    progress: number,
    buttonText: string,
    openSnackbar: boolean
}

type DicomDropzoneProps = {
    savePatients: Function
}

class DicomDropzone extends Component<DicomDropzoneProps, DicomDropzoneState> {

    constructor(props: DicomDropzoneProps) {
        super(props);
        this.state = {
            patients: new Patients(),
            loadingPatients: false,
            loadingAcceptedFiles: false,
            progress: 0,
            buttonText: "Select or drop folders or files",
            openSnackbar: false
        }
    }

    processAcceptedFiles = (acceptedFiles: Blob[]) => {
        const patients = new Patients()
        const percentCount = parseInt(acceptedFiles.length / 100)
        let percentage = percentCount
        let fileCounter = 0
        this.setState({loadingAcceptedFiles: false, loadingPatients: true})
        trackPromise(
            acceptedFiles.reduce((previousPromise: Promise<void>, file) => {
                const imageID: string = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
                return previousPromise.then(() => {
                    return new Promise<void>((resolve => {
                        const reader = new FileReader()
                        const imagePath: string = file.path
                        reader.onload = () => {
                            loadFile(patients, reader, imagePath, imageID)
                            fileCounter++
                            if (fileCounter >= percentage) {
                                percentage += percentCount
                                let progress = this.state.progress
                                if (progress < 100) {
                                    progress++
                                }
                                this.setState({progress: progress})
                            }
                            resolve()
                        }
                        reader.readAsArrayBuffer(file)
                    }))
                });
            }, Promise.resolve()).then(() => {
                this.props.savePatients(patients)
                this.setState({
                    patients: patients,
                    loadingPatients: false,
                    buttonText: "Select or drop folders or files",
                    openSnackbar: true
                })
            })
        );
    }

    getFilesFromEvent = (event: Event | DropEvent) => {
        if (event._reactName === "onDrop") {
            this.props.savePatients(undefined)
            this.setState({loadingAcceptedFiles: true, progress: 0, buttonText: ""})
            return trackPromise(fromEvent(event as Event).then((acceptedFiles => {
                return new Promise<(FileWithPath | DataTransferItem)[]>((resolve => {
                    resolve(acceptedFiles)
                }))
            })))
        } else if (event._reactName === "onDragEnter") {
            this.setState({buttonText: "Drop here"})
        }
        return new Promise((() => {
        }))
    }

    onTreeStateChange = (state: any, event: any) => {
        //console.log(state, event)
    }

    renderProgress = () => {
        if (this.state.loadingPatients) {
            return (
                <Box sx={{positon: "absolute"}}>
                    <CircularProgressWithLabel value={this.state.progress}/>
                </Box>
            )
        } else if (this.state.loadingAcceptedFiles) {
            return (
                <Box sx={{
                    position: 'absolute',
                    marginLeft: 10.5,
                    marginTop: -6.6
                }}>
                    <CircularProgress sx={{color: "secondary.main"}}/>
                </Box>
            )
        }
    }

    render() {
        return (
            <div>
                <Dropzone
                    onDragLeave={() => this.setState({buttonText: "Select or drop folders or files"})}
                    onDrop={async acceptedFiles => this.processAcceptedFiles(acceptedFiles)}
                    getFilesFromEvent={async event => this.getFilesFromEvent(event)}>
                    {({getRootProps, getInputProps}) => (
                        <Box sx={{
                            width: 200
                        }} {...getRootProps()}>
                            <input {...getInputProps()} />
                            <Button sx={{minWidth: 200, minHeight: 55}} variant="outlined">
                                {this.state.buttonText}
                            </Button>
                            {
                                this.renderProgress()
                            }
                        </Box>
                    )}
                </Dropzone>
                <Snackbar
                    anchorOrigin={{vertical: "bottom", horizontal: "center"}}
                    open={this.state.openSnackbar}
                    autoHideDuration={6000}
                    onClose={() => this.setState({openSnackbar: false})}
                    message="Patients loaded"
                />
            </div>
        )
    }

}

export default DicomDropzone;