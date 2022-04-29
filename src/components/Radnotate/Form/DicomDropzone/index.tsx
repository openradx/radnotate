import React, {ReactElement, useState} from 'react'
import Dropzone, {DropEvent} from 'react-dropzone'
import {Patients} from "./dicomObject";
import {trackPromise} from "react-promise-tracker";
import {fromEvent, FileWithPath} from "file-selector";
import {loadFile} from "./loaders";
import {Box, Button, CircularProgress, CircularProgressProps, Snackbar, Tooltip, Typography} from "@mui/material";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import cornerstone from "cornerstone-core";
import dicomParser from "dicom-parser";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

const CircularProgressWithLabel = (props: CircularProgressProps & { value: number }) => {
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


type DicomDropzoneProps = {
    setPatients: Function
}

const DicomDropzone = (props: DicomDropzoneProps): ReactElement => {
    const [loadingPatients, setLoadingPatients] = useState(false)
    const [loadingAcceptedFiles, setLoadingAcceptedFiles] = useState(false)
    const [progress, setProgress] = useState(0)
    const [buttonText, setButtonText] = useState("Select DICOM files")
    const [openSnackbar, setOpenSnackbar] = useState(false)

    const processAcceptedFiles = (acceptedFiles: Blob[]): void => {
        const patients = new Patients()
        const percentCount = Math.ceil(acceptedFiles.length / 100)
        let percentage = percentCount
        let fileCounter = 0
        setLoadingAcceptedFiles(false)
        setLoadingPatients(true)
        trackPromise(
            acceptedFiles.reduce((previousPromise: Promise<void>, file: Blob) => {
                const imageID: string = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
                return previousPromise.then(() => {
                    return new Promise<void>((resolve => {
                        const reader = new FileReader()
                        const imagePath: string = file.path
                        reader.onload = (): void => {
                            loadFile(patients, reader, imagePath, imageID)
                            fileCounter++
                            if (fileCounter >= percentage) {
                                percentage += percentCount
                                setProgress(progress => ++progress)
                            }
                            resolve()
                        }
                        reader.readAsArrayBuffer(file)
                    }))
                });
            }, Promise.resolve()).then(() => {
                props.setPatients(patients)
                setProgress(100)
                setLoadingPatients(false)
                setButtonText("Select DICOM files")
                setOpenSnackbar(true)
            })
        );
    }

    const getFilesFromEvent = (event: Event | DropEvent): Promise<FileWithPath | DataTransferItem> => {
        if (event._reactName === "onDrop" || event._reactName === "onChange") {
            setLoadingAcceptedFiles(true)
            setProgress(0)
            setButtonText("")
            return trackPromise(fromEvent(event as Event).then((acceptedFiles => {
                return new Promise<(FileWithPath | DataTransferItem)[]>((resolve => {
                    resolve(acceptedFiles)
                }))
            })))
        } else if (event._reactName === "onDragEnter") {
            setButtonText("Drop here")
        }
        return new Promise((() => {
        }))
    }

    const renderProgress = (): ReactElement => {
        if (loadingPatients) {
            return (
                <Box sx={{positon: "absolute"}}>
                    <CircularProgressWithLabel value={progress}/>
                </Box>
            )
        } else if (loadingAcceptedFiles) {
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

    return (
        <div>
            <Dropzone
                onDragLeave={() => setButtonText("Select or drop folders or dicom files")}
                onDrop={async acceptedFiles => processAcceptedFiles(acceptedFiles)}
                getFilesFromEvent={async event => getFilesFromEvent(event)}>
                {({getRootProps, getInputProps}) => (
                    <Box sx={{
                        width: 200
                    }} {...getRootProps()}>
                        <input {...getInputProps()} directory={""} webkitdirectory={""} mozdirectory={""}
                               type={"file"} multiple={true}/>
                        
                        <Tooltip title={"Or drag and drop"}>
                            <Button sx={{minWidth: 200, minHeight: 55}} variant="outlined">
                                {buttonText}
                            </Button>
                        </Tooltip>
                        {
                            renderProgress()
                        }
                    </Box>
                )}
            </Dropzone>
            <Snackbar
                anchorOrigin={{vertical: "bottom", horizontal: "center"}}
                open={openSnackbar}
                autoHideDuration={6000}
                onClose={() => setOpenSnackbar(false)}
                message="Patients loaded"
            />
        </div>
    )
}

export default DicomDropzone;