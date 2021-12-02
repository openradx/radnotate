import React, {Component} from 'react'
import Dropzone, {DropEvent} from 'react-dropzone'
import FolderTree from 'react-folder-tree';
import {Patients} from "./dicomObject";
import {usePromiseTracker, trackPromise} from "react-promise-tracker";
import Loader from "react-loader-spinner"
import {fromEvent, FileWithPath} from "file-selector";
import {loadFile} from "./loaders";
import {Container} from './styles';
import {Button} from "@mui/material";

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
    loading: boolean
}

class DicomDropzone extends Component<{}, DicomDropzoneState> {

    constructor() {
        super();
        this.state = {
            patients: new Patients(),
            loading: false
        }
    }

    processAcceptedFiles = (acceptedFiles: Blob[]) => {
        const patients = new Patients()
        this.setState({loading: true})
        trackPromise(
            acceptedFiles.reduce((previousPromise: Promise<void>, file: Blob) => {
                return previousPromise.then(() => {
                    return new Promise<void>((resolve => {
                        const reader = new FileReader()
                        const imagePath: string = file.path
                        reader.onload = () => {
                            loadFile(patients, reader, imagePath)
                            resolve()
                        }
                        reader.readAsArrayBuffer(file)
                    }))
                });
            }, Promise.resolve()).then(() => {
                console.log(patients)
                this.setState({patients: patients, loading: false})
            })
        );
    }

    getFilesFromEvent = (event: Event | DropEvent) => {
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
            <Container>
                <Dropzone
                    onDrop={async acceptedFiles => this.processAcceptedFiles(acceptedFiles)}
                    getFilesFromEvent={async event => this.getFilesFromEvent(event)}>
                    {({getRootProps, getInputProps}) => (
                        <div style={{display: "flex", "justify-content": "center", font:"Roboto"}}>
                            <div {...getRootProps()}>
                                <input {...getInputProps()} />
                                <Button variant="outlined" sx={{fontSize: 14}}>Select or drop<br/>folders or files</Button>
                            </div>
                        </div>
                    )}
                </Dropzone>
                <div style={{fontFamily: "Roboto", color: "white"}}>
                    {this.state.loading ?
                        <LoadingIndicator/>
                        :
                        <FolderTree
                            data={this.state.patients?.treeNode}
                            onChange={this.onTreeStateChange}
                            indentPixels={30}
                            style={{font:"Roboto"}}
                            readOnly/>}
                </div>
            </Container>
        )
    }

}

export default DicomDropzone;