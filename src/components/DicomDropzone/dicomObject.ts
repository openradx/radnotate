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
    imagePath: string
}

class Series {
    seriesInstanceUID: string;
    seriesDescription: string;
    modality: string;
    images: ImageType[];

    constructor(seriesDict: SeriesType, imageDict: ImageType) {
        this.seriesInstanceUID = seriesDict.seriesInstanceUID
        this.seriesDescription = seriesDict.seriesDescription
        this.modality = seriesDict.modality
        this.images = [imageDict]
    }

    add(images: ImageType[]) {
        this.images.push(...images)
    }
}

class Study {
    studyInstanceUID: string;
    studyDescription: string;
    studyDate: string;
    series: Series[];

    constructor(studyDict: StudyType, seriesDict: SeriesType, imageDict: ImageType) {
        this.studyInstanceUID = studyDict.studyInstanceUID
        this.studyDescription = studyDict.studyDescription
        this.studyDate = studyDict.studyDate
        const series = new Series(seriesDict, imageDict)
        this.series = []
        this.add(series)
    }

    add(newSeries: Series) {
        if (this.series.length === 0) {
            this.series = [newSeries]
        } else {
            let isSame: boolean = false
            this.series.forEach((series) => {
                if (series.seriesInstanceUID === newSeries.seriesInstanceUID && !isSame) {
                    series.add(newSeries.images)
                    isSame = true
                }
            })
            if (!isSame) {
                this.series.push(newSeries)
            }
        }
    }

    get(index: number) {
        return this.series[index]
    }
}

export class Patient {
    patientID: string;
    studies: Study[];

    constructor(patientDict: PatientType, studyDict: StudyType, seriesDict: SeriesType, imageDict: ImageType) {
        this.patientID = patientDict.patientID;
        this.studies = []
        const study = new Study(studyDict, seriesDict, imageDict)
        this.add(study)
    }

    add(newStudy: Study) {
        if (this.studies.length === 0) {
            this.studies = [newStudy]
        } else {
            let isSame: boolean = false
            this.studies.forEach((study) => {
                if (study.studyInstanceUID === newStudy.studyInstanceUID && !isSame) {
                    study.add(newStudy.get(0))
                    isSame = true
                }
            })
            if (!isSame) {
                this.studies.push(newStudy)
            }
        }
    }

    get(index: number) {
        return this.studies[index]
    }
}

export class Patients {
    patients: Patient[]

    constructor() {
        this.patients = []
    }

    add(newPatient: Patient) {
        if (this.patients.length === 0) {
            this.patients = [newPatient]
        } else {
            let isSame: boolean = false
            this.patients.forEach((patient) => {
                if (patient.patientID === newPatient.patientID && !isSame) {
                    patient.add(newPatient.get(0))
                    isSame = true
                }
            })
            if (!isSame) {
                this.patients.push(newPatient)
            }
        }
    }
}
