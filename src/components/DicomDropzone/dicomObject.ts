export type PatientType = {
    patientID: string
}

export type StudyType = {
    studyInstanceUID: string,
    studyDescription: string,
    studyDate: string,
}

export type SeriesType = {
    seriesInstanceUID: string,
    seriesDescription: string,
    modality: string,
}

export type ImageType = {
    imagePath: string,
    imageID: string
}

export type TreeNodeType = {
    name: string,
    checked: number,
    isOpen: boolean,
    children?: TreeNodeType[],
}

class Series {
    seriesInstanceUID: string;
    seriesDescription: string;
    modality: string;
    images: ImageType[];
    treeNode: TreeNodeType;

    constructor(seriesDict: SeriesType, imageDict: ImageType) {
        this.seriesInstanceUID = seriesDict.seriesInstanceUID
        this.seriesDescription = seriesDict.seriesDescription
        this.modality = seriesDict.modality
        this.images = [imageDict]
        this.treeNode = {
            name: this.seriesDescription,
            checked: 0,
            isOpen: true,
            children: []
        }
    }

    addImage(images: ImageType[]) {
        this.images.push(...images)
    }
}

class Study {
    studyInstanceUID: string;
    studyDescription: string;
    studyDate: string;
    series: Series[];
    treeNode: TreeNodeType;

    constructor(studyDict: StudyType, seriesDict: SeriesType, imageDict: ImageType) {
        this.studyInstanceUID = studyDict.studyInstanceUID
        this.studyDescription = studyDict.studyDescription
        this.studyDate = studyDict.studyDate
        const series = new Series(seriesDict, imageDict)
        this.series = []
        this.treeNode = {
            name: this.studyDescription,
            checked: 0,
            isOpen: true,
            children: []
        }
        this.addSeries(series)
    }

    addSeries(newSeries: Series) {
        if (this.series.length === 0) {
            this.series = [newSeries]
            this.treeNode.children?.push(newSeries.treeNode)
        } else {
            let isSame: boolean = false
            this.series.forEach((series) => {
                if (series.seriesInstanceUID === newSeries.seriesInstanceUID && !isSame) {
                    series.addImage(newSeries.images)
                    isSame = true
                }
            })
            if (!isSame) {
                this.series.push(newSeries)
                this.treeNode.children?.push(newSeries.treeNode)
            }
        }
    }

    getSeries(index: number) {
        return this.series[index]
    }
}

export class Patient {
    patientID: string;
    studies: Study[];
    treeNode: TreeNodeType;

    constructor(patientDict: PatientType, studyDict: StudyType, seriesDict: SeriesType, imageDict: ImageType) {
        this.patientID = patientDict.patientID;
        this.studies = []
        const study = new Study(studyDict, seriesDict, imageDict)
        this.treeNode = {
            name: this.patientID,
            checked: 0,
            isOpen: true,
            children: []
        }
        this.addStudy(study)
    }

    addStudy(newStudy: Study) {
        if (this.studies.length === 0) {
            this.studies = [newStudy]
            this.treeNode.children?.push(newStudy.treeNode)
        } else {
            let isSame: boolean = false
            this.studies.forEach((study) => {
                if (study.studyInstanceUID === newStudy.studyInstanceUID && !isSame) {
                    study.addSeries(newStudy.getSeries(0))
                    isSame = true
                }
            })
            if (!isSame) {
                this.studies.push(newStudy)
                this.treeNode.children?.push(newStudy.treeNode)
            }
        }
    }

    getStudy(index: number) {
        return this.studies[index]
    }
}

export class Patients {
    patients: Patient[]
    treeNode: TreeNodeType

    constructor() {
        this.patients = []
        this.treeNode = {
            name: "Patients",
            checked: 0,
            isOpen: true,
            children: []
        }
    }

    addPatient(newPatient: Patient) {
        if (this.patients.length === 0) {
            this.patients = [newPatient]
            this.treeNode.children?.push(newPatient.treeNode)
        } else {
            let isSame: boolean = false
            this.patients.forEach((patient) => {
                if (patient.patientID === newPatient.patientID && !isSame) {
                    patient.addStudy(newPatient.getStudy(0))
                    isSame = true
                }
            })
            if (!isSame) {
                this.patients.push(newPatient)
                this.treeNode.children?.push(newPatient.treeNode)
            }
        }
    }

    getPatient(index: number) {
        return this.patients[index]
    }
}
