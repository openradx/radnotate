import React, {Component, useCallback} from 'react'
import Dropzone from 'react-dropzone'
import dicomParser, {DataSet} from "dicom-parser";
import FolderTree, {testData} from 'react-folder-tree';
import {Patient, Patients, PatientType, StudyType, SeriesType, ImageType} from "./dicomObject";
import Tree from "./DicomTree";
import {SiTruenas} from "react-icons/all";
import {readFile} from "fs";

type TreeNodeType = {
    name: string,
    checked: number,
    isOpen: boolean,
    children?: TreeNodeType[],
}

type DicomDropzoneState = {
    droppedPatients: Patients | null,
    treeState: TreeNodeType,
}

class DicomDropzone extends React.Component<{}, DicomDropzoneState> {

    initialTreeState: any;

    constructor() {
        super();
        this.state = {
            treeState: {
                name: 'Empty',
                checked: 0,
                isOpen: false,
                children: [],
            },
            droppedPatients: null
        }
    }

    patientDict = (dataSet: typeof DataSet): PatientType => ({
        patientID: dataSet.string('x00100020')
    })

    studyDict = (dataSet: typeof DataSet): StudyType => ({
        studyInstanceUID: dataSet.string('x0020000d'),
        studyDescription: dataSet.string('x00081030'),
        studyDate: dataSet.string('x00080020')
    })

    seriesDict = (dataSet: typeof DataSet): SeriesType => ({
        seriesInstanceUID: dataSet.string('x0020000e'),
        seriesDescription: dataSet.string('x0008103e'),
        modality: dataSet.string('x00080060'),
        numberOfSeriesRelatedInstances: dataSet.string('x00201209')
    })

    imageDict = (dataSet: typeof DataSet, imagePath: string, byteArray: Uint8Array): ImageType => ({
        sopInstanceUID: dataSet.string('x00080018'),
        imagePath: imagePath,
        byteArray: byteArray
    })

    patientsToTree = (patients: Patients) => {
        const patientsTreeNode: TreeNodeType = {
            name: "Patients",
            checked: 0,
            isOpen: true,
            children: []
        }
        patients.patients.forEach((patient) => {
            const patientTreeNode: TreeNodeType = {
                name: patient.patientID,
                checked: 0,
                isOpen: true,
                children: []
            }
            patient.studies.forEach((study) => {
                const studyTreeNode: TreeNodeType = {
                    name: study.studyDescription,
                    checked: 0,
                    isOpen: true,
                    children: []
                }
                study.series.forEach((series) => {
                    const seriesTreeNode: TreeNodeType = {
                        name: series.seriesDescription,
                        checked: 0,
                        isOpen: true,
                        children: []
                    }
                    studyTreeNode.children.push(seriesTreeNode)
                })
                patientTreeNode.children.push(studyTreeNode)
            })
            patientsTreeNode.children.push(patientTreeNode)
        })
        return patientsTreeNode
    }

    processAcceptedFiles = (acceptedFiles: Blob[]) => {
        const patients = new Patients()
        let patient: Patient
        acceptedFiles.reduce((previousPromise: Promise<void>, file: Blob) => {
            return previousPromise.then(() => {
                return new Promise<void>((resolve => {
                    const reader = new FileReader()
                    const imagePath: string = file.path
                    reader.onload = () => {
                        const byteArray = new Uint8Array(reader.result)
                        const dataSet = dicomParser.parseDicom(byteArray)
                        patient = new Patient(this.patientDict(dataSet), this.studyDict(dataSet), this.seriesDict(dataSet),
                            this.imageDict(dataSet, imagePath, byteArray))
                        patients.add(patient)
                        resolve()
                    }
                    reader.readAsArrayBuffer(file)
                }))
            });
        }, Promise.resolve()).then(() => {
            const tree = this.patientsToTree(patients)
            console.log(tree)
            this.setState({droppedPatients: patients, treeState: tree})
        });
    }

    onTreeStateChange = (state: any, event: any) => {
        //console.log(state, event)
    };

    render() {
        return (
            <div>
                <Dropzone
                    onDrop={acceptedFiles => this.processAcceptedFiles(acceptedFiles)}>
                    {({getRootProps, getInputProps}) => (
                        <section>
                            <div {...getRootProps()}>
                                <input {...getInputProps()} />
                                <p>Drag 'n' drop some files here, or click to select files</p>
                            </div>
                        </section>
                    )}
                </Dropzone>
                <FolderTree
                    data={this.state.treeState}
                    onChange={this.onTreeStateChange}
                    readOnly
                />
            </div>
        )
    }

}

export default DicomDropzone;