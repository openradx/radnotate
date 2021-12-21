import React, {Component} from 'react'
import Dropzone, {DropEvent} from 'react-dropzone'
import {Patients} from "./dicomObject";
import {trackPromise} from "react-promise-tracker";
import {fromEvent, FileWithPath} from "file-selector";
import {loadFile} from "./loaders";
import {Box, Button, CircularProgress, CircularProgressProps, Typography} from "@mui/material";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import cornerstone from "cornerstone-core";
import dicomParser from "dicom-parser";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

function CircularProgressWithLabel(props: CircularProgressProps & { value: number }) {
    return (
        <Box sx={{
            position: 'absolute',
            marginLeft: 8.5,
            marginTop: -6.3
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
    progress: number
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
            progress: 0
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
                this.setState({patients: patients, loadingPatients: false})
            })
        );
    }

    getFilesFromEvent = (event: Event | DropEvent) => {
        this.props.savePatients(undefined)
        this.setState({loadingAcceptedFiles: true, progress: 0})
        return trackPromise(fromEvent(event as Event).then((acceptedFiles => {
            return new Promise<(FileWithPath | DataTransferItem)[]>((resolve => {
                resolve(acceptedFiles)
            }))
        })))
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
                    marginLeft: 8.5,
                    marginTop: -6.3
                }}>
                    <CircularProgress sx={{color: "secondary.main"}}/>
                </Box>
            )
        }
    }

    render() {
        let buttonSx = {}
        if (this.state.loadingPatients || this.state.loadingAcceptedFiles) {
            buttonSx = {
                color: "rgba(0, 0, 0, 0.30)"
            }
        }
        return (
            <div>
                <Dropzone
                    onDrop={async acceptedFiles => this.processAcceptedFiles(acceptedFiles)}
                    getFilesFromEvent={async event => this.getFilesFromEvent(event)}>
                    {({getRootProps, getInputProps}) => (
                        <div style={{
                            width: 175
                        }} {...getRootProps()}>
                            <input {...getInputProps()} />
                            <Box sx={{positon: "absolute"}}>
                                <Button sx={buttonSx} variant="outlined">
                                    Select or drop folders or files
                                </Button>
                            </Box>
                            {
                                this.renderProgress()
                            }
                        </div>
                    )}
                </Dropzone>
            </div>
        )
    }

}

export default DicomDropzone;