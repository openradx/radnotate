import React, {Component} from 'react'
import Dropzone, {DropEvent} from 'react-dropzone'
import FolderTree from 'react-folder-tree';
import {Patients} from "./dicomObject";
import {usePromiseTracker, trackPromise} from "react-promise-tracker";
import Loader from "react-loader-spinner"
import {fromEvent, FileWithPath} from "file-selector";
import {loadFile} from "./loaders";
import {Style} from './styles';
import {Button} from "@mui/material";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import cornerstone from "cornerstone-core";
import dicomParser from "dicom-parser";
import {LoadingButton} from '@mui/lab';

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

const LoadingIndicator = () => {
    const {promiseInProgress} = usePromiseTracker();

    return (
        promiseInProgress &&
        <div style={{
            width: "100%",
            height: "100",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
        }}>
            <Loader type="ThreeDots" color="orange" height="100" width="100"/>
        </div>
    )
}

type DicomDropzoneState = {
    patients: Patients | null,
    loadingPatients: boolean
}

type DicomDropzoneProps = {
    savePatients: Function
}

class DicomDropzone extends Component<DicomDropzoneProps, DicomDropzoneState> {

    constructor(props: DicomDropzoneProps) {
        super(props);
        this.state = {
            patients: new Patients(),
            loadingPatients: false
        }
    }

    processAcceptedFiles = (acceptedFiles: Blob[]) => {
        const patients = new Patients()
        trackPromise(
            acceptedFiles.reduce((previousPromise: Promise<void>, file) => {
                const imageID: string = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
                return previousPromise.then(() => {
                    return new Promise<void>((resolve => {
                        const reader = new FileReader()
                        const imagePath: string = file.path
                        reader.onload = () => {
                            loadFile(patients, reader, imagePath, imageID)
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
        this.setState({loadingPatients: true})
        return trackPromise(fromEvent(event as Event).then((acceptedFiles => {
            return new Promise<(FileWithPath | DataTransferItem)[]>((resolve => {
                resolve(acceptedFiles)
            }))
        })))
    }

    onTreeStateChange = (state: any, event: any) => {
        //console.log(state, event)
    }

    render() {
        return (
            <div>
                <Dropzone
                    onDrop={async acceptedFiles => this.processAcceptedFiles(acceptedFiles)}
                    getFilesFromEvent={async event => this.getFilesFromEvent(event)}>
                    {({getRootProps, getInputProps}) => (
                        <div style={{
                            display: "flex",
                            "justifyContent": "center",
                            font: "Roboto",
                            width: 175
                        }} {...getRootProps()}>
                            <input {...getInputProps()} />
                            <LoadingButton
                                variant="outlined"
                                sx={{fontSize: 14}}
                                loading={this.state.loadingPatients}>
                                Select or drop folders or files
                            </LoadingButton>
                            {/*<Button variant="outlined" sx={{fontSize: 14}}>Select or drop<br/>folders or files</Button>*/}
                        </div>
                    )}
                </Dropzone>
            </div>
        )
    }

}

export default DicomDropzone;