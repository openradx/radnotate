import React, {useCallback} from 'react'
import {useDropzone} from 'react-dropzone'
import dicomParser from "dicom-parser";
import FolderTree, { testData } from 'react-folder-tree';
import {Patient, Patients} from "./dicomObject";
import exp from "constants";

const DicomDropzone = () => {

    const onDrop = useCallback(acceptedFiles => {

        const patients = new Patients()
        let patient: Patient
        acceptedFiles.forEach((file) => {
            const reader = new FileReader()
            reader.onload = () => {
                const arrayBuffer = reader.result
                const byteArray = new Uint8Array(arrayBuffer)
                const dataSet = dicomParser.parseDicom(byteArray)
                const patientID = dataSet.string('x00100020')
                const studyInstanceUID = dataSet.string('x0020000d')
                const seriesInstanceUID = dataSet.string('x0020000e')

                patient = new Patient(patientID, studyInstanceUID, seriesInstanceUID)
                patients.add(patient)
            }
            reader.readAsArrayBuffer(file)
        })
        console.log(patients)
    }, [])
    const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop})

    return (
        <div {...getRootProps()}>
            <input {...getInputProps()} />
            {
                isDragActive ?
                    <p>Drop the files here ...</p> :
                    <p>Drag 'n' drop some files here, or click to select files</p>
            }
        </div>
    )
}

export default DicomDropzone;