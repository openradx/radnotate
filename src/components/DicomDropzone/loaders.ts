import dicomParser, {DataSet} from "dicom-parser";
import {ImageType, Patient, Patients, PatientType, SeriesType, StudyType} from "./dicomObject";


const patientDict = (dataSet: typeof DataSet): PatientType => ({
    patientID: dataSet.string('x00100020')
})

const studyDict = (dataSet: typeof DataSet): StudyType => ({
    studyInstanceUID: dataSet.string('x0020000d'),
    studyDescription: dataSet.string('x00081030'),
    studyDate: dataSet.string('x00080020')
})

const seriesDict = (dataSet: typeof DataSet): SeriesType => ({
    seriesInstanceUID: dataSet.string('x0020000e'),
    seriesDescription: dataSet.string('x0008103e'),
    modality: dataSet.string('x00080060'),
})

const imageDict = (dataSet: typeof DataSet, imagePath: string): ImageType => ({
    imagePath: imagePath,
})

const loadDicom = (byteArray: Uint8Array, imagePath: string) => {
    const dataSet = dicomParser.parseDicom(byteArray)
    const patient = new Patient(patientDict(dataSet), studyDict(dataSet), seriesDict(dataSet),
        imageDict(dataSet, imagePath))
    return patient
}

export const loadFile = (patients: Patients, reader: FileReader, imagePath: string) => {

    const byteArray = new Uint8Array(reader.result)
    let patient: Patient
    if (imagePath.endsWith(".nii.gz") || imagePath.endsWith(".nii")) {
        // ToDo implement
    } else if (imagePath.endsWith(".dcm") || !isNaN(Number(imagePath.slice(imagePath.length -1)))) {
        patient = loadDicom(byteArray, imagePath)
    } else {
        // ToDo handle
        console.log("Wrong input type.")
    }
    patients.addPatient(patient)
}
