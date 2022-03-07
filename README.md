# Radnotate

A radiological annotation tool for DICOM data for a fast and convenient annotation workflow.

## Features
* Load DICOM data into the application
* Define a set of variables and corresponding types you want to annotate
* Availabe variable types:
    * Boolean
    * Integer
    * Elliptical ROI
    * Rectangle ROI
    * Seed
    * Length
    * Segmentation
* Annotate the loaded DICOM data according to your defined variables in a structured way
* Annotation data is automatically written to a data table
* You can export the annotation data any time as CSV file
* The exported CSV file can be loaded at a later point to either only reuse the variable definitions or to reload all annotations and proceed with a previous annotation workflow
## Upcoming features
* DICOM Web compatible communication
    * DICOM Q/R on some remote DICOM target
    * Conveniently select and directly load DICOM data
    * Send annotations as DICOM segmentation files or DICOM structured report back to some remote DICOM target
* Export annotations as Nifti, DICOM segmentations or DICOM structured report to local file system
* Tablet mode for annotations with a touchscreen
* Web application 
    * LDAP compatible user management
    * Calculation and extraction of Radiomics features of made annotations
## To Dos
* Refactor code and make it typesafe
* Write unit frontend tests
* Implement Django backend for license management using keygen.sh
* Integrate license management into app
* Web application
    * Implement Django backend for user and DICOM management, aswell as Radiomics computation
* Write integration tests
## License
[GNU GPLv3](https://choosealicense.com/licenses/gpl-3.0/#)
